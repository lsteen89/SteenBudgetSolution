import twAnimate from "tw-animate-css";

module.exports = {
    darkMode: ["class"],
    content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx,html}", 
	"./src/styles/animations.css",
  ],
  safelist: ['max-w-lg', 'max-w-5xl'],
  theme: {
  	extend: {
  		zIndex: {
  			modal: '99999'
  		},
  		screens: {
  			sm: '640px',
  			md: '768px',
  			lg: '1024px',
  			xl: '1280px',
  			'2xl': '1536px',
  			'3xl': {
  				raw: '(min-width: 1921px)'
  			},
  			ipadPro: {
  				raw: '(width: 1024) and (height: 1366px)'
  			}
  		},
        backgroundImage: {
          'dashboard-bird': "url('/src/assets/Components/Background/DashboardBirdBackground.png')",
          'form-gradient': 'linear-gradient(to bottom, #f3f4f6, #e5e7eb)'
        },
  		fontFamily: {
  			inter: [
  				'Inter',
  				'Roboto',
  				'Montserrat',
  				'sans-serif'
  			]
  		},
  		backgroundSize: {
  			cover: 'cover'
  		},
  		colors: {
  			body: '#333333',
  			customBlue1: '#eff6ff',
  			customBlue2: '#dbeafe',
  			customBlue3: '#e5f3ff',
  			limeGreen: '#98FF98',
  			darkLimeGreen: '#32CD32',
  			standardMenuColor: '#CCE5FF',
  			darkBlueMenuColor: '#001F3F',
  			pastelGreen: '#ebf8ff',
  			pastelGreen1: '#d1fae5',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		keyframes: {
  			fadeIn: {
  				'0%': {
  					opacity: 0
  				},
  				'100%': {
  					opacity: 1
  				}
  			},
  			'img-float-key': {
  				'0%, 100%': {
  					transform: 'translateY(0)'
  				},
  				'50%': {
  					transform: 'translateY(-5px)'
  				}
  			},
  			'img-flap-key': {
  				'0%, 100%': {
  					transform: 'rotate(0)'
  				},
  				'50%': {
  					transform: 'rotate(5deg)'
  				}
  			},
  			'img-pulse': {
  				'0%': {
  					transform: 'scale(1)'
  				},
  				'50%': {
  					transform: 'scale(1.1)'
  				},
  				'100%': {
  					transform: 'scale(1)'
  				}
  			},
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
  			'fade-in': 'fadeIn 0.5s ease-out',
  			'img-float': 'img-float-key 3s ease-in-out infinite',
  			'img-flap': 'img-flap-key 0.5s ease-in-out infinite',
  			'img-pulse': 'img-pulse 1.5s ease-in-out infinite',
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		},
  		padding: {
  			safe: 'env(safe-area-inset-bottom)'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [
    require("tailwindcss-animate"),  
  ],
};
