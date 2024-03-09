import React from 'react';
import CloudComponent from './CloudComponent';

const Layout = ({ children }) => {
  return (
    <>
      <CloudComponent />
      <main>{children}</main>
      {/* Add a Footer component here if you have one */}
    </>
  );
};

export default Layout;
