module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx,html}", 
  ],
  theme: {
    extend: {
      screens: {
        '1920': '1920px', // Custom breakpoint for 1920px width
        '3xl': '3440px', // Ultra-wide screens
        'hd': '1280px', // Custom breakpoint for 1280px width
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
