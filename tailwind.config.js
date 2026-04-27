/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Legacy KC token group — keep for backwards compatibility with
        // existing components. New work should use the `ss.*` (Sandy Serenity)
        // tokens below.
        kc: {
          porcelain: '#DFDDD9',
          linen: '#F5F3EF',
          card: '#F5F3EF',
          dark: '#2C2C2A',
          text: '#2C2C2A',
          label: '#6B665C',
          muted: '#9B8C82',
          hint: '#B7A99D',
          stone: '#9F9A8C',
          biscuit: '#C2B39F',
          filter: '#D1CBC5',
          border: 'rgba(0,0,0,0.04)',
          divider: 'rgba(0,0,0,0.06)',
        },
        // Sandy Serenity design system (Section 3 of the UX/UI brief).
        // Use these tokens going forward — e.g. bg-ss-page, text-ss-muted-text,
        // bg-ss-onest-bg, border-ss-divider, etc. CSS variables of the same
        // names are also exposed in globals.css for inline-style use.
        ss: {
          // Backgrounds
          page:    '#DFDDD9', // Porcelain — page background
          card:    '#F5F3EF', // Linen — card background
          surface: '#DFDDD9', // same as page; used inside cards
          hover:   '#EEEAE4', // card hover state
          muted:   '#E8E5DF', // dividers, disabled backgrounds
          divider: '#E8E5DF', // 0.5px borders inside cards/forms
          // Text
          text:        '#2C2C2A', // Charcoal — primary text
          'muted-text': '#9B8C82', // Stone — secondary/label text
          hint:        '#B7A99D', // hint/placeholder text
          // Sidebar
          sidebar: {
            DEFAULT: '#2C2C2A',
            hover:   '#3A3A37',
            text:    '#9B8C82',
            active:  '#F5F3EF',
          },
          // Brand colors
          onest: {
            DEFAULT: '#2D5016', // deep green
            bg:      '#D4EDBE',
            text:    '#2D5016',
          },
          grubby: {
            DEFAULT: '#1B4D2A', // forest green
            bg:      '#C8E0D0',
            text:    '#1B4D2A',
          },
          // Note: 'ss.kc' is the KC brand color (warm grey). The 'kc.*' group
          // above is the legacy token namespace — different concept, same word.
          kc: {
            DEFAULT: '#5F5E5A', // warm grey
            bg:      '#E8E5DF',
            text:    '#5F5E5A',
          },
          // Cross-brand (e.g. Design Director, People Lead) — purple.
          both: {
            DEFAULT: '#3C3489',
            bg:      '#EEEDFE',
          },
          // Progress status — based on % of target hit.
          red: {
            DEFAULT: '#A32D2D', // < 40% of target
            bg:      '#FAEEDA',
          },
          amber: {
            DEFAULT: '#BA7517', // 40–70% of target
            bg:      '#FAEEDA',
          },
          green: {
            DEFAULT: '#639922', // ≥ 70% of target
            bg:      '#EAF3DE',
          },
        },
      },
      // Typography guidance (no Tailwind tokens — kept here for reference):
      //   Labels:        9.5–11px, uppercase, tracking-wider
      //   Card titles:   12.5–13px
      //   Primary values: 15px, medium weight
      //   Borders:       0.5px solid #E8E5DF (use border-ss-divider)
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        thai: ['var(--font-sarabun)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
