import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  LiquidGlassView,
  usePerformanceMonitor,
  type DisplacementMode,
  type CaptureMode,
  type PerformanceTier,
} from 'expo-rn-liquid-glass-view';

// ── Color Palette ──

const COLORS = [
  { name: 'Coral Red', hex: '#FF6B6B' },
  { name: 'Turquoise', hex: '#4ECDC4' },
  { name: 'Sky Blue', hex: '#45B7D1' },
  { name: 'Sage Green', hex: '#96CEB4' },
  { name: 'Sunflower', hex: '#FFEAA7' },
  { name: 'Plum', hex: '#DDA0DD' },
  { name: 'Tangerine', hex: '#FF8C42' },
  { name: 'Royal Purple', hex: '#6C5CE7' },
  { name: 'Mint', hex: '#A8E6CF' },
  { name: 'Hot Pink', hex: '#FD79A8' },
  { name: 'Electric Blue', hex: '#0984E3' },
  { name: 'Lemon', hex: '#FDCB6E' },
  { name: 'Lavender', hex: '#A29BFE' },
  { name: 'Peach', hex: '#FAB1A0' },
  { name: 'Teal', hex: '#00B894' },
  { name: 'Slate', hex: '#636E72' },
  { name: 'Rose', hex: '#E84393' },
  { name: 'Ocean', hex: '#0652DD' },
  { name: 'Amber', hex: '#F39C12' },
  { name: 'Forest', hex: '#27AE60' },
];

// ── Defaults ──

const DEFAULTS = {
  displacementScale: 0,
  blurAmount: 0.0625,
  saturation: 140,
  aberrationIntensity: 2,
  cornerRadius: 20,
  mode: 'standard' as DisplacementMode,
  overLight: false,
  captureMode: 'realtime' as CaptureMode,
  captureInterval: 120,
};

const MODES: DisplacementMode[] = ['standard', 'polar', 'prominent', 'shader'];
const CAPTURE_MODES: CaptureMode[] = ['none', 'static', 'periodic', 'realtime'];
const PERF_TIERS: PerformanceTier[] = ['high', 'medium', 'low', 'minimal'];
const PERF_MODES: Array<'auto' | 'manual'> = ['auto', 'manual'];

// ── Custom Slider ──

function CustomSlider({
  value,
  min,
  max,
  step,
  onValueChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (v: number) => void;
}) {
  const trackRef = useRef<View>(null);
  const pct = ((value - min) / (max - min)) * 100;

  const handleTouch = useCallback(
    (pageX: number) => {
      trackRef.current?.measure((_x, _y, width, _h, px) => {
        const ratio = Math.max(0, Math.min(1, (pageX - px) / width));
        const raw = min + ratio * (max - min);
        const stepped = Math.round(raw / step) * step;
        onValueChange(Math.max(min, Math.min(max, stepped)));
      });
    },
    [min, max, step, onValueChange],
  );

  return (
    <View
      ref={trackRef}
      style={s.sliderTrack}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => handleTouch(e.nativeEvent.pageX)}
      onResponderMove={(e) => handleTouch(e.nativeEvent.pageX)}
    >
      <View style={[s.sliderFill, { width: `${pct}%` }]} />
      <View style={[s.sliderThumb, { left: `${pct}%` }]} />
    </View>
  );
}

// ── Options Modal ──

function OptionsModal({
  visible,
  onClose,
  state,
  onChange,
  onReset,
  perfMode,
  perfTier,
  currentFps,
  averageFps,
  isAutoMode,
  onPerfModeChange,
  onTierChange,
}: {
  visible: boolean;
  onClose: () => void;
  state: typeof DEFAULTS;
  onChange: <K extends keyof typeof DEFAULTS>(key: K, value: (typeof DEFAULTS)[K]) => void;
  onReset: () => void;
  perfMode: 'auto' | 'manual';
  perfTier: PerformanceTier;
  currentFps: number | null;
  averageFps: number | null;
  isAutoMode: boolean;
  onPerfModeChange: (mode: 'auto' | 'manual') => void;
  onTierChange: (tier: PerformanceTier) => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.modalOverlay}>
        <View style={s.modalSheet}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Glass Options</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={s.modalClose}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={s.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Displacement Scale */}
            <OptionSection
              label="Displacement Scale"
              desc="Refraction intensity — how much the background warps"
              value={state.displacementScale.toFixed(0)}
            >
              <CustomSlider
                value={state.displacementScale}
                min={0}
                max={200}
                step={1}
                onValueChange={(v) => onChange('displacementScale', v)}
              />
            </OptionSection>

            {/* Blur Amount */}
            <OptionSection
              label="Blur Amount"
              desc="Backdrop blur strength (0 = minimal, 1 = maximum)"
              value={state.blurAmount.toFixed(3)}
            >
              <CustomSlider
                value={state.blurAmount}
                min={0}
                max={1}
                step={0.005}
                onValueChange={(v) => onChange('blurAmount', v)}
              />
            </OptionSection>

            {/* Saturation */}
            <OptionSection
              label="Saturation"
              desc="Color saturation of backdrop (100 = normal, 200+ = vivid)"
              value={`${state.saturation.toFixed(0)}%`}
            >
              <CustomSlider
                value={state.saturation}
                min={0}
                max={300}
                step={1}
                onValueChange={(v) => onChange('saturation', v)}
              />
            </OptionSection>

            {/* Aberration Intensity */}
            <OptionSection
              label="Aberration Intensity"
              desc="Chromatic color split at glass edges"
              value={state.aberrationIntensity.toFixed(1)}
            >
              <CustomSlider
                value={state.aberrationIntensity}
                min={0}
                max={10}
                step={0.1}
                onValueChange={(v) => onChange('aberrationIntensity', v)}
              />
            </OptionSection>

            {/* Corner Radius */}
            <OptionSection
              label="Corner Radius"
              desc="Rounded corners of the glass shape (px)"
              value={`${state.cornerRadius.toFixed(0)}px`}
            >
              <CustomSlider
                value={state.cornerRadius}
                min={0}
                max={60}
                step={1}
                onValueChange={(v) => onChange('cornerRadius', v)}
              />
            </OptionSection>

            {/* Mode Picker */}
            <OptionSection
              label="Displacement Mode"
              desc="Algorithm used to generate the warp map"
              value={state.mode}
            >
              <View style={s.chipRow}>
                {MODES.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[s.chip, state.mode === m && s.chipActive]}
                    onPress={() => onChange('mode', m)}
                  >
                    <Text style={[s.chipText, state.mode === m && s.chipTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </OptionSection>

            {/* Capture Mode */}
            <OptionSection
              label="Capture Mode"
              desc="How the background is captured for refraction"
              value={state.captureMode}
            >
              <View style={s.chipRow}>
                {CAPTURE_MODES.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[s.chip, state.captureMode === m && s.chipActive]}
                    onPress={() => onChange('captureMode', m)}
                  >
                    <Text style={[s.chipText, state.captureMode === m && s.chipTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </OptionSection>

            {/* Capture Interval (only for periodic/realtime) */}
            {(state.captureMode === 'periodic' || state.captureMode === 'realtime') && (
              <OptionSection
                label="Capture Interval"
                desc={
                  state.captureMode === 'realtime'
                    ? 'Minimum interval between captures (ms)'
                    : 'Interval between captures (ms)'
                }
                value={`${state.captureInterval}ms`}
              >
                <CustomSlider
                  value={state.captureInterval}
                  min={16}
                  max={1000}
                  step={1}
                  onValueChange={(v) => onChange('captureInterval', v)}
                />
              </OptionSection>
            )}

            {/* Over Light */}
            <View style={s.optionRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.optionLabel}>Over Light</Text>
                <Text style={s.optionDesc}>Light background mode with enhanced shadows</Text>
              </View>
              <Switch
                value={state.overLight}
                onValueChange={(v) => onChange('overLight', v)}
                trackColor={{ true: '#6C5CE7' }}
              />
            </View>

            {/* Performance */}
            <View style={s.perfSection}>
              <View style={s.optionHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.optionLabel}>Performance</Text>
                  <Text style={s.optionDesc}>
                    Monitor and adapt effect quality based on device capability
                  </Text>
                </View>
              </View>

              {/* FPS Display */}
              <View style={s.perfStats}>
                <View style={s.perfStat}>
                  <Text
                    style={[
                      s.perfFps,
                      {
                        color:
                          currentFps === null
                            ? 'rgba(255,255,255,0.4)'
                            : currentFps > 40
                              ? '#00B894'
                              : currentFps > 24
                                ? '#FDCB6E'
                                : '#FF6B6B',
                      },
                    ]}
                  >
                    {currentFps ?? '--'}
                  </Text>
                  <Text style={s.perfStatLabel}>FPS</Text>
                </View>
                <View style={s.perfStat}>
                  <Text style={s.perfAvg}>{averageFps ?? '--'}</Text>
                  <Text style={s.perfStatLabel}>Avg</Text>
                </View>
                <View style={s.perfStat}>
                  <Text style={s.perfTier}>{perfTier}</Text>
                  <Text style={s.perfStatLabel}>Tier</Text>
                </View>
              </View>

              {/* Adaptation Mode */}
              <Text style={[s.optionLabel, { marginTop: 16, marginBottom: 8 }]}>
                Adaptation Mode
              </Text>
              <View style={s.chipRow}>
                {PERF_MODES.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[s.chip, perfMode === m && s.chipActive]}
                    onPress={() => onPerfModeChange(m)}
                  >
                    <Text style={[s.chipText, perfMode === m && s.chipTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Quality Tier (manual mode only) */}
              <Text style={[s.optionLabel, { marginTop: 16, marginBottom: 4 }]}>
                Quality Tier
              </Text>
              <Text style={[s.optionDesc, { marginBottom: 8 }]}>
                {isAutoMode
                  ? 'Controlled automatically based on FPS'
                  : 'Manually select effect quality level'}
              </Text>
              <View style={s.chipRow}>
                {PERF_TIERS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      s.chip,
                      perfTier === t && s.chipActive,
                      isAutoMode && s.chipDisabled,
                    ]}
                    onPress={() => !isAutoMode && onTierChange(t)}
                    disabled={isAutoMode}
                  >
                    <Text
                      style={[
                        s.chipText,
                        perfTier === t && s.chipTextActive,
                        isAutoMode && s.chipTextDisabled,
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Reset */}
            <TouchableOpacity style={s.resetBtn} onPress={onReset}>
              <Text style={s.resetText}>Reset to Defaults</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function OptionSection({
  label,
  desc,
  value,
  children,
}: {
  label: string;
  desc: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.optionSection}>
      <View style={s.optionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.optionLabel}>{label}</Text>
          <Text style={s.optionDesc}>{desc}</Text>
        </View>
        <Text style={s.optionValue}>{value}</Text>
      </View>
      {children}
    </View>
  );
}

// ── Main App ──

export default function App() {
  const backgroundRef = useRef<View>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [ready, setReady] = useState(false);
  const [opts, setOpts] = useState(DEFAULTS);
  const [perfMode, setPerfMode] = useState<'auto' | 'manual'>('auto');

  const {
    currentFps,
    averageFps,
    currentTier,
    adjustedProps,
    handlePerformanceReport,
    setTier,
    isAutoMode,
  } = usePerformanceMonitor({ mode: perfMode });

  const handleChange = useCallback(
    <K extends keyof typeof DEFAULTS>(key: K, value: (typeof DEFAULTS)[K]) => {
      setOpts((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.root} edges={['top', 'bottom']}>
        <StatusBar style={opts.overLight ? 'dark' : 'light'} />

        {/* Scrollable color palette background */}
        <View ref={backgroundRef as any} style={s.bgContainer} collapsable={false}>
          <ScrollView
            style={StyleSheet.absoluteFill}
            contentContainerStyle={s.bgContent}
          >
            {COLORS.map((c) => (
              <View key={c.hex} style={[s.colorStrip, { backgroundColor: c.hex }]}>
                <Text style={s.colorName}>{c.name}</Text>
                <Text style={s.colorHex}>{c.hex}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Glass effect overlay */}
        <View style={s.glassContainer} pointerEvents="box-none">
          <LiquidGlassView
            style={s.glass}
            mode={opts.mode}
            overLight={opts.overLight}
            backgroundRef={backgroundRef}
            captureMode={opts.captureMode}
            captureInterval={opts.captureInterval}
            cornerRadius={opts.cornerRadius}
            displacementScale={opts.displacementScale}
            aberrationIntensity={opts.aberrationIntensity}
            blurAmount={opts.blurAmount}
            saturation={opts.saturation}
            onReady={() => setReady(true)}
            onPerformanceReport={handlePerformanceReport}
            {...adjustedProps}
          >
            <View style={s.glassContent}>
              <Text style={s.glassTitle}>Hello Glass</Text>
              <Text style={s.glassSubtitle}>
                {opts.mode} {ready ? '✓' : '…'}
              </Text>
            </View>
          </LiquidGlassView>
        </View>

        {/* Glass Button Row */}
        <View style={s.glassButtonRow} pointerEvents="box-none">
          <TouchableOpacity activeOpacity={0.8} onPress={() => setShowAbout(true)}>
            <LiquidGlassView
              style={s.glassButton}
              backgroundRef={backgroundRef as any}
              captureMode={opts.captureMode}
              captureInterval={opts.captureInterval}
              cornerRadius={opts.cornerRadius}
              displacementScale={opts.displacementScale}
              aberrationIntensity={opts.aberrationIntensity}
              blurAmount={opts.blurAmount}
              saturation={opts.saturation}
              overLight={opts.overLight}
              mode={opts.mode}
            >
              <View style={s.glassButtonContent}>
                <Text style={s.glassButtonText}>About</Text>
              </View>
            </LiquidGlassView>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.8} onPress={() => setShowOptions(true)}>
            <LiquidGlassView
              style={s.glassButton}
              backgroundRef={backgroundRef as any}
              captureMode={opts.captureMode}
              captureInterval={opts.captureInterval}
              cornerRadius={opts.cornerRadius}
              displacementScale={opts.displacementScale}
              aberrationIntensity={opts.aberrationIntensity}
              blurAmount={opts.blurAmount}
              saturation={opts.saturation}
              overLight={opts.overLight}
              mode={opts.mode}
            >
              <View style={s.glassButtonContent}>
                <Text style={s.glassButtonText}>Settings</Text>
              </View>
            </LiquidGlassView>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.8} onPress={() => setOpts(DEFAULTS)}>
            <LiquidGlassView
              style={s.glassButton}
              tintGradient="linear-gradient(180deg, rgba(253,151,61,0.1), rgba(255,115,0,0.9))"
              backgroundRef={backgroundRef as any}
              captureMode='static'
              // captureMode={opts.captureMode}
              captureInterval={opts.captureInterval}
              cornerRadius={opts.cornerRadius}
              displacementScale={opts.displacementScale}
              aberrationIntensity={opts.aberrationIntensity}
              blurAmount={opts.blurAmount}
              saturation={opts.saturation}
              overLight={opts.overLight}
              mode={opts.mode}
            >
              <View style={s.glassButtonContent}>
                <Text style={s.glassButtonText}>Reset</Text>
              </View>
            </LiquidGlassView>
          </TouchableOpacity>
        </View>

        {/* About Glass Modal */}
        <Modal visible={showAbout} animationType="fade" transparent>
          <View style={s.glassModalOverlay}>
            <View style={s.glassModalCenter}>
              <LiquidGlassView
                style={s.glassModalContent}
                backgroundRef={backgroundRef as any}
                captureMode={opts.captureMode}
                captureInterval={opts.captureInterval}
                cornerRadius={opts.cornerRadius}
                displacementScale={opts.displacementScale}
                aberrationIntensity={opts.aberrationIntensity}
                blurAmount={opts.blurAmount}
                saturation={opts.saturation}
                overLight={opts.overLight}
                mode={opts.mode}
              >
                <View style={s.glassModalInner}>
                  <Text style={s.glassModalTitle}>Liquid Glass</Text>
                  <Text style={s.glassModalText}>
                    Cross-platform liquid glass effect for React Native. Uses a WebView-based SVG
                    filter pipeline to render Apple-style glass effects on both iOS and Android.
                  </Text>
                  <Text style={s.glassModalText}>
                    Supports displacement maps, chromatic aberration, backdrop blur, and background
                    refraction with multiple capture modes.
                  </Text>
                  <TouchableOpacity
                    style={s.glassModalCloseBtn}
                    onPress={() => setShowAbout(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.glassModalCloseText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </LiquidGlassView>
            </View>
          </View>
        </Modal>

        {/* Options Modal */}
        <OptionsModal
          visible={showOptions}
          onClose={() => setShowOptions(false)}
          state={opts}
          onChange={handleChange}
          onReset={() => setOpts(DEFAULTS)}
          perfMode={perfMode}
          perfTier={currentTier}
          currentFps={currentFps}
          averageFps={averageFps}
          isAutoMode={isAutoMode}
          onPerfModeChange={setPerfMode}
          onTierChange={setTier}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ── Styles ──

const { width: SCREEN_W } = Dimensions.get('window');

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },

  // Background
  bgContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  bgContent: {
    paddingVertical: 60,
  },
  colorStrip: {
    width: SCREEN_W,
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  colorName: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  colorHex: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    fontVariant: ['tabular-nums'],
  },

  // Glass
  glassContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glass: {
    width: SCREEN_W - 60,
    height: 220,
  },
  glassContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  glassSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
  },

  // Glass Buttons
  glassButtonRow: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 12,
  },
  glassButton: {
    width: 100,
    height: 44,
  },
  glassButtonContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Glass Modal
  glassModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassModalCenter: {
    width: SCREEN_W - 40,
  },
  glassModalContent: {
    width: SCREEN_W - 40,
    minHeight: 300,
  },
  glassModalInner: {
    flex: 1,
    padding: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassModalTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  glassModalText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  glassModalCloseBtn: {
    marginTop: 12,
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  glassModalCloseText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  modalClose: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C5CE7',
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // Option sections
  optionSection: {
    marginBottom: 24,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  optionDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  optionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C5CE7',
    marginLeft: 12,
    minWidth: 50,
    textAlign: 'right',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },

  // Custom slider
  sliderTrack: {
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(108,92,231,0.4)',
    borderRadius: 16,
  },
  sliderThumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginLeft: -12,
    top: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },

  // Chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  chipActive: {
    backgroundColor: '#6C5CE7',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  chipTextActive: {
    color: '#fff',
  },

  // Performance
  perfSection: {
    marginBottom: 24,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  perfStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  perfStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  perfFps: {
    fontSize: 24,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  perfAvg: {
    fontSize: 24,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
    fontVariant: ['tabular-nums'],
  },
  perfTier: {
    fontSize: 16,
    fontWeight: '700',
    color: '#A29BFE',
    textTransform: 'capitalize',
  },
  perfStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipTextDisabled: {
    color: 'rgba(255,255,255,0.4)',
  },

  // Reset
  resetBtn: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  resetText: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
    fontSize: 14,
  },
});
