import React from 'react';
import MediaQuery from 'react-responsive';

const MediaQueryTest: React.FC = () => {
  return (
    <div>
      <MediaQuery minWidth={1367}>
        <p>isDesktop: true</p>
      </MediaQuery>
      <MediaQuery maxWidth={1366}>
        <p>isDesktop: false</p>
      </MediaQuery>
    </div>
  );
};

export default MediaQueryTest;
