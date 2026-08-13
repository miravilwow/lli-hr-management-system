import { theme as antdTheme } from 'antd';

/**
 * Design tokens for the whole application.
 *
 * The accent is a muted steel blue rather than a saturated teal: this is a
 * records system people sit in for hours, so the colour marks what is
 * interactive and then gets out of the way. It is used for primary
 * buttons, links and the selected navigation item, and nowhere else.
 * Semantic colours are kept separate, so "interactive" never reads as
 * "warning".
 */
const light = {
  colorPrimary: '#2C5E8F',
  colorPrimaryHover: '#35709F',
  colorPrimaryActive: '#244E78',
  colorSuccess: '#2E7D5B',
  colorWarning: '#9A6B18',
  colorError: '#B4443A',
  colorInfo: '#2C5E8F',
  colorLink: '#2C5E8F',

  // Neutrals lean very slightly cool so they belong with the accent.
  colorBgLayout: '#F6F7F9',
  colorBgContainer: '#FFFFFF',
  colorBgElevated: '#FFFFFF',
  colorText: '#171F2A',
  colorTextSecondary: '#46566A',
  colorTextTertiary: '#6B7C90',
  colorBorder: '#E1E6EC',
  colorBorderSecondary: '#EDF1F5',
};

const dark = {
  colorPrimary: '#6FA3D4',
  colorPrimaryHover: '#84B4E0',
  colorPrimaryActive: '#5B8FC0',
  colorSuccess: '#6BBF95',
  colorWarning: '#D2A65A',
  colorError: '#E28A80',
  colorInfo: '#6FA3D4',
  colorLink: '#6FA3D4',

  colorBgLayout: '#0D1219',
  colorBgContainer: '#151D26',
  colorBgElevated: '#1C2631',
  colorText: '#E9EFF5',
  colorTextSecondary: '#B2C0CE',
  colorTextTertiary: '#7E8FA0',
  colorBorder: '#26323E',
  colorBorderSecondary: '#1F2A35',
};

const shared = {
  fontFamily:
    "'Segoe UI', -apple-system, BlinkMacSystemFont, system-ui, 'Helvetica Neue', sans-serif",
  fontSize: 14,
  borderRadius: 8,
  borderRadiusLG: 12,
  borderRadiusSM: 6,
  controlHeight: 36,
  wireframe: false,
};

/**
 * Component overrides, so pages carry no ad-hoc inline styling.
 *
 * headerBg matters more than it looks: Ant Design defaults Layout.Header
 * to a dark navy, so overriding only siderBg left the light theme with a
 * dark bar and dark contents on it - an unreadable header.
 */
function components(t) {
  return {
    Layout: {
      headerBg: t.colorBgContainer,
      headerHeight: 60,
      headerPadding: '0 20px',
      siderBg: t.colorBgContainer,
      bodyBg: t.colorBgLayout,
    },
    Menu: {
      itemHeight: 40,
      itemMarginInline: 8,
      itemBorderRadius: 8,
      itemSelectedBg: t === light ? '#EAF1F8' : '#1B2A3A',
    },
    Table: {
      headerBg: 'transparent',
      headerSplitColor: 'transparent',
      cellPaddingBlock: 14,
    },
    Card: { paddingLG: 20 },
    Statistic: { titleFontSize: 13, contentFontSize: 26 },
    Button: { fontWeight: 500, primaryShadow: 'none', defaultShadow: 'none' },
    Modal: { titleFontSize: 17 },
  };
}

export function buildTheme(mode) {
  const token = mode === 'dark' ? dark : light;

  return {
    algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: { ...shared, ...token },
    components: components(token),
  };
}
