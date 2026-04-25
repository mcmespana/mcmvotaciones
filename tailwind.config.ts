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
			colors: {
				border: 'hsl(var(--border))',
				voting: {
					blue: 'hsl(var(--vote-color-blue))',
					red: 'hsl(var(--vote-color-red))',
					yellow: 'hsl(var(--vote-color-yellow))',
					green: 'hsl(var(--vote-color-green))',
				},
				outline: {
					variant: 'hsl(var(--outline-variant))',
				},
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				surface: {
					DEFAULT: 'hsl(var(--surface))',
					foreground: 'hsl(var(--surface-foreground))',
					container: {
						lowest: 'hsl(var(--surface-container-lowest))',
						low: 'hsl(var(--surface-container-low))',
						DEFAULT: 'hsl(var(--surface-container))',
						high: 'hsl(var(--surface-container-high))',
						highest: 'hsl(var(--surface-container-highest))',
					},
				},
				overlay: {
					DEFAULT: 'hsl(var(--overlay))',
					foreground: 'hsl(var(--overlay-foreground))',
				},
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					glow: 'hsl(var(--primary-glow))',
					container: 'hsl(var(--primary-container))',
					fixed: 'hsl(var(--primary-fixed))',
					'fixed-dim': 'hsl(var(--primary-fixed-dim))',
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))',
					container: 'hsl(var(--secondary-container))',
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
					glow: 'hsl(var(--accent-glow))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				}
			},
			backgroundImage: {
				'gradient-tech': 'var(--gradient-tech)',
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-secondary': 'var(--gradient-secondary)'
			},
			boxShadow: {
				'tech': 'var(--shadow-card)',
				'glow': 'var(--shadow-primary)',
				'accent-glow': 'var(--shadow-accent)'
			},
			fontFamily: {
				headline: ['Plus Jakarta Sans', 'Segoe UI', 'sans-serif'],
				body: ['Inter', 'Segoe UI', 'sans-serif'],
				label: ['Inter', 'Segoe UI', 'sans-serif'],
				mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace']
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				xl: 'calc(var(--radius) + 1rem)',
				'2xl': 'calc(var(--radius) + 1.5rem)',
				'3xl': 'calc(var(--radius) + 2rem)',
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
