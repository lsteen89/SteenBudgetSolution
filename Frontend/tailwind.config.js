module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx,html}", 
  ],
  theme: {
    extend: {
		screens: {
		  sm: '640px',   // small phones & portrait screens
		  md: '768px',   // tablets
		  lg: '1024px',  // small laptops
		  xl: '1280px',  // desktops
		  '2xl': '1536px', // larger desktops
		  '3xl': { raw: '(min-width: 1921px)' }, // Screens wider than 1920px
		  'ipadPro': { raw: '(width: 1024) and (height: 1366px)' },
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
		limeGreen: '#98FF98', 
		darkLimeGreen: '#32CD32',
		standardMenuColor: '#CCE5FF', 
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out', // Define fade-in animation
      },
      backgroundImage: {
        'form-gradient': 'linear-gradient(to bottom, #f3f4f6, #e5e7eb)', // Slight gradient background for forms
      },
      padding: {
        safe: 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
};
