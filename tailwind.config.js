const tone = (name) => `rgb(var(--rgb-${name}) / <alpha-value>)`;
export default {
  content: ['./index.html', './App.tsx', './main.tsx'],
  theme: {
    extend: {
      colors: {
        canvas: tone('canvas'), panel: tone('panel'), inset: tone('inset'),
        elevated: tone('elevated'), line: tone('line'), 'line-strong': tone('line-strong'),
        ink: tone('ink'), muted: tone('muted'), soft: tone('soft'),
        accent: tone('accent'), 'accent-hover': tone('accent-hover'),
        success: tone('success'), 'success-wash': tone('success-wash'),
        warning: tone('warning'), inverse: tone('inverse')
      },
      fontFamily: { sans: ['Manrope', 'system-ui', 'sans-serif'] }
    }
  },
  plugins: []
};
