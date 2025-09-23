import type { Config } from 'tailwindcss';


export default {
content: [
"./src/app/**/*.{ts,tsx}",
"./src/components/**/*.{ts,tsx}"
],
theme: {
extend: {
colors: {
brand: {
DEFAULT: '#E10600', // Selfcast red (adjust if needed)
dark: '#B10500'
}
},
borderRadius: {
'2xl': '1rem'
}
}
},
plugins: []
} satisfies Config;
