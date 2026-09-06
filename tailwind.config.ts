import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
	darkMode: "class",
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			/* Los colores viven en el bloque `@theme` de `src/index.css`.
			   Este fichero NO lo carga Tailwind 4 (no hay `@config`), así que
			   duplicarlos aquí solo servía para que pareciesen definidos cuando no
			   lo estaban. Se mantiene el config por `content`, `darkMode`,
			   animaciones y plugins. */
			boxShadow: {
				'avd-xs': 'var(--avd-shadow-xs)',
				'avd-sm': 'var(--avd-shadow-sm)',
				'avd-md': 'var(--avd-shadow-md)',
				'avd-lg': 'var(--avd-shadow-lg)',
			},
			fontFamily: {
				headline: ['Plus Jakarta Sans', 'Segoe UI', 'sans-serif'],
				body: ['Inter', 'Segoe UI', 'sans-serif'],
				label: ['Inter', 'Segoe UI', 'sans-serif'],
				mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
				'avd-sans': ['var(--avd-font-sans)'],
				'avd-mono': ['var(--avd-font-mono)'],
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				xl: 'calc(var(--radius) + 1rem)',
				'2xl': 'calc(var(--radius) + 1.5rem)',
				'3xl': 'calc(var(--radius) + 2rem)',
				'avd-xs': 'var(--avd-radius-xs)',
				'avd-sm': 'var(--avd-radius-sm)',
				'avd':    'var(--avd-radius)',
				'avd-md': 'var(--avd-radius-md)',
				'avd-lg': 'var(--avd-radius-lg)',
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [tailwindcssAnimate],
} satisfies Config;
