import { alpha, createTheme } from '@mui/material/styles';

export type AppThemeMode = 'light' | 'dark';

const tokens = {
  light: {
    primary: '#177c86',
    primaryDark: '#136a73',
    accent: '#157580',
    background: '#f7f7f8',
    paper: '#ffffff',
    text: '#18181b',
    muted: '#71717a',
    divider: '#e4e4e7',
    hover: '#f4f4f5',
    success: '#15803d',
    warning: '#b45309',
    error: '#dc2626',
  },
  dark: {
    primary: '#1b7a84',
    primaryDark: '#16656d',
    accent: '#3aa9b3',
    background: '#1b1b1f',
    paper: '#1f2024',
    text: '#f4f4f5',
    muted: '#a1a1aa',
    divider: '#2e3036',
    hover: '#25262b',
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#f87171',
  },
};

declare module '@mui/material/styles' {
  interface Palette {
    accent: string;
  }
  interface PaletteOptions {
    accent?: string;
  }
}

export function createAppTheme(mode: AppThemeMode) {
  const c = tokens[mode];

  return createTheme({
    palette: {
      mode,
      primary: { main: c.primary, dark: c.primaryDark, contrastText: '#ffffff' },
      success: { main: c.success },
      warning: { main: c.warning },
      error: { main: c.error },
      background: { default: c.background, paper: c.paper },
      text: { primary: c.text, secondary: c.muted },
      divider: c.divider,
      action: { hover: c.hover },
      accent: c.accent,
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: "'Manrope Variable', ui-sans-serif, system-ui, sans-serif",
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiButtonBase: { defaultProps: { disableRipple: false } },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 8, minHeight: 36, whiteSpace: 'nowrap' },
          outlined: { borderColor: c.divider, color: c.text, '&:hover': { borderColor: c.divider, backgroundColor: c.hover } },
          text: { color: c.accent },
        },
      },
      MuiIconButton: {
        styleOverrides: { root: { borderRadius: 8, color: c.muted, '&:hover': { color: c.text, backgroundColor: c.hover } } },
      },
      MuiPaper: {
        styleOverrides: {
          outlined: { borderRadius: 16, borderColor: c.divider, backgroundColor: c.paper },
          rounded: { backgroundImage: 'none' },
        },
      },
      MuiMenu: {
        styleOverrides: { paper: { borderRadius: 12, border: `1px solid ${c.divider}`, marginTop: 4, minWidth: 176 } },
      },
      MuiMenuItem: {
        styleOverrides: { root: { borderRadius: 8, margin: '0 4px', fontSize: 14, gap: 8 } },
      },
      MuiListItemIcon: { styleOverrides: { root: { minWidth: 0, color: 'inherit' } } },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: 16, border: `1px solid ${c.divider}`, backgroundImage: 'none' } },
      },
      MuiDialogTitle: { styleOverrides: { root: { fontSize: 16, fontWeight: 700, padding: '14px 12px 14px 20px' } } },
      MuiDialogActions: { styleOverrides: { root: { padding: '12px 20px', gap: 4 } } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            backgroundColor: c.paper,
            fontSize: 14,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: c.divider },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: c.primary, boxShadow: `0 0 0 3px ${alpha(c.primary, 0.2)}` },
          },
        },
      },
      MuiFormHelperText: { styleOverrides: { root: { marginLeft: 0, fontSize: 12 } } },
      MuiFormLabel: {
        styleOverrides: { root: { color: c.text, fontSize: 14, fontWeight: 600, '&.Mui-focused': { color: c.text } } },
      },
      MuiChip: { styleOverrides: { root: { borderRadius: 999, fontWeight: 500 }, sizeSmall: { borderRadius: 6 } } },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: c.divider, fontSize: 14, padding: '12px 16px' },
          head: {
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: c.muted,
            whiteSpace: 'nowrap',
            padding: '10px 16px',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: { '&:last-child td': { borderBottom: 0 }, '&.MuiTableRow-hover:hover': { backgroundColor: c.hover } },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600, fontSize: 14, minWidth: 0, padding: '8px 0', marginRight: 24, minHeight: 40, color: c.muted, '&.Mui-selected': { color: c.accent } },
        },
      },
      MuiTabs: { styleOverrides: { root: { minHeight: 40, borderBottom: `1px solid ${c.divider}` } } },
      MuiPaginationItem: {
        styleOverrides: { root: { borderColor: c.divider, '&.Mui-selected': { color: c.accent, borderColor: c.primary } } },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderColor: c.divider,
            color: c.text,
            '&.Mui-selected': { color: c.accent, backgroundColor: alpha(c.primary, 0.14), borderColor: c.primary },
          },
        },
      },
      MuiTooltip: { styleOverrides: { tooltip: { fontSize: 12 } } },
      MuiDrawer: { styleOverrides: { paper: { backgroundColor: c.paper, backgroundImage: 'none', borderColor: c.divider } } },
    },
  });
}
