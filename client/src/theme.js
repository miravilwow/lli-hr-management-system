import { theme as antdTheme } from 'antd';

/**
 * Design tokens for the whole application.
 *
 * The palette is deliberately not Ant Design's default blue. This is a
 * records system people sit in for hours, so the ground is a warm-leaning
 * neutral and the accent is a deep teal that stays legible on both
 * grounds without shouting. Semantic colours are kept separate from the
 * accent so "this is interactive" never reads as "this is a warning".
 */
const brand = {
  primary: '#0E7490',
  primaryHover: '#0F6785',
  primaryActive: '#155E75',
  success: '#15803D',
  warning: '#B45309',
  danger: '#B42318',
  info: '#0E7490',
};

const shared = {
  fontFamily:
    "'Segoe UI', -apple-system, BlinkMacSystemFont, system-ui, 'Helvetica Neue', sans-serif",
  fontSize: 14,
  borderRadius: 8,
  borderRadiusLG: 10,
  borderRadiusSM: 6,
  controlHeight: 36,
  wireframe: false,
};

const light = {
  ...shared,
  colorPrimary: brand.primary,
  colorPrimaryHover: brand.primaryHover,
  colorPrimaryActive: brand.primaryActive,
  colorSuccess: brand.success,
  colorWarning: brand.warning,
  colorError: brand.danger,
  colorInfo: brand.info,

  // Neutrals carry a slight cool bias toward the accent, so greys read as
  // chosen rather than inherited.
  colorBgLayout: '#F4F6F8',
  colorBgContainer: '#FFFFFF',
  colorBgElevated: '#FFFFFF',
  colorText: '#111B22',
  colorTextSecondary: '#41535F',
  colorTextTertiary: '#677885',
  colorBorder: '#DCE3E9',
  colorBorderSecondary: '#E8EDF1',

  boxShadowTertiary:
    '0 1px 2px rgba(17, 27, 34, 0.04), 0 4px 16px -8px rgba(17, 27, 34, 0.10)',
};

const dark = {
  ...shared,
  colorPrimary: '#3BA9C4',
  colorPrimaryHover: '#55BBD3',
  colorPrimaryActive: '#2E93AC',
  colorSuccess: '#3DA35D',
  colorWarning: '#D69B4A',
  colorError: '#E3776B',
  colorInfo: '#3BA9C4',

  colorBgLayout: '#0C1117',
  colorBgContainer: '#141C24',
  colorBgElevated: '#1A242E',
  colorText: '#E8EFF4',
  colorTextSecondary: '#AEBECB',
  colorTextTertiary: '#7C8E9C',
  colorBorder: '#26333F',
  colorBorderSecondary: '#1E2A35',

  boxShadowTertiary: '0 1px 2px rgba(0,0,0,0.4), 0 8px 24px -12px rgba(0,0,0,0.6)',
};

/** Component-level overrides, so pages do not carry ad-hoc inline styles. */
const components = {
  Layout: {
    siderBg: 'transparent',
    headerHeight: 60,
    headerPadding: '0 24px',
  },
  Menu: {
    itemHeight: 40,
    itemMarginInline: 8,
    itemBorderRadius: 8,
  },
  Table: {
    headerBg: 'transparent',
    headerSplitColor: 'transparent',
    cellPaddingBlock: 14,
    rowHoverBg: 'rgba(14, 116, 144, 0.05)',
  },
  Card: {
    paddingLG: 20,
  },
  Statistic: {
    titleFontSize: 13,
    contentFontSize: 26,
  },
  Button: {
    fontWeight: 500,
    primaryShadow: 'none',
    defaultShadow: 'none',
  },
};

export function buildTheme(mode) {
  return {
    algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: mode === 'dark' ? dark : light,
    components,
  };
}

export const palette = { light, dark, brand };
