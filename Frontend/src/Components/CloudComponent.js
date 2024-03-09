import React from 'react';
import cloudImage from '../assets/Images/CloudsMenu.PNG'; // Ensure the path is correct

const CloudComponent = () => {
  const backgroundStyle = {
    width: '100%',
    height: '200px', // Adjust height as needed
    backgroundImage: `url(${cloudImage})`, // Use the imported image
    backgroundSize: 'cover', // Cover the entire width and height of the div
    backgroundPosition: 'center center', // Center the background image
    display: 'flex',
    justifyContent: 'center', // Center children horizontally
    alignItems: 'center', // Center children vertically
    color: '#fff', // Adjust text color as needed for contrast
  };

  return (
    <div style={backgroundStyle}>
      <div>
        <h1>Welcome to Our Site</h1>
        <p><a href="/page1">Link to Page 1</a></p>
        <p><a href="/page2">Link to Page 2</a></p>
      </div>
    </div>
  );
};

export default CloudComponent;
