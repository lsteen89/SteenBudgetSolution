module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx,html}", 
	"./src/styles/animations.css",
  ],
  safelist: ['max-w-lg', 'max-w-5xl'],
  theme: {
    extend: {
		zIndex: {
			modal: '99999',          // sits above everything
		},
		screens: {
		  sm: '640px',   // small phones & portrait screens
		  md: '768px',   // tablets
		  lg: '1024px',  // small laptops
		  xl: '1280px',  // desktops
		  '2xl': '1536px', // larger desktops
		  '3xl': { raw: '(min-width: 1921px)' }, // Screens wider than 1920px
		  'ipadPro': { raw: '(width: 1024) and (height: 1366px)' },
		},
		backgroundImage: {
			'dashboard-bird': "url('/src/assets/Components/Background/DashboardBirdBackground.png')",
			'form-gradient': 'linear-gradient(to bottom, #f3f4f6, #e5e7eb)',
		},
      fontFamily: {
        inter: [ 'Inter', 'Roboto', 'Montserrat', 'sans-serif'], // Fallback order
      },
	backgroundSize: {
        'cover': 'cover',
      },
      colors: {
        body: '#333333', // Global default text color
        customBlue1: '#eff6ff', // Light blue
        customBlue2: '#dbeafe', // Slightly darker blue
		customBlue3: '#e5f3ff',   // 
		limeGreen: '#98FF98', 
		darkLimeGreen: '#32CD32',
		standardMenuColor: '#CCE5FF', 
		darkBlueMenuColor: '#001F3F',
		pastelGreen: '#ebf8ff', // Very subtle
		pastelGreen1: '#d1fae5', // Very subtle
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
		  'img-float-key': {
		  '0%, 100%': { transform: 'translateY(0)' },
		  '50%': { transform: 'translateY(-5px)' },
		},
		'img-flap-key': {
		  '0%, 100%': { transform: 'rotate(0)' },
		  '50%': { transform: 'rotate(5deg)' },
		},
		'img-pulse': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out', // Define fade-in animation
		'img-float': 'img-float-key 3s ease-in-out infinite',
        'img-flap': 'img-flap-key 0.5s ease-in-out infinite',
		'img-pulse': 'img-pulse 1.5s ease-in-out infinite',
      },
      padding: {
        safe: 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
};
