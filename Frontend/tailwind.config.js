module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx,html}", 
  ],
  theme: {
    extend: {
		screens: {
		  md: '768px', // Tablets
		  lg: '1024px', // Small desktops
		  xl: { raw: '(min-width: 1280px) and (max-width: 1919px)' }, // Large screens, excluding 1920px
		  '3xl': { raw: '(min-width: 1921px)' }, // Screens wider than 1920px
		  'iphone-se': { raw: '(width: 375px) and (height: 667px)' }, // iPhone SE (2nd gen)
		  'ipad': { raw: '(width: 810px) and (height: 1080px)' }, // iPad in portrait mode
		  '1920': { raw: '(width: 1920px) and (height: 1080px)' }, // Full HD resolution
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
    },
  },
  plugins: [],
};
