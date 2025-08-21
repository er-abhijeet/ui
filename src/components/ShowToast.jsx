import React from 'react'
import toast from 'react-hot-toast'


// Show toast for PC users only
function isPC() {
  const ua = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  return !isMobile && window.innerWidth > 600;
}

const ShowToastOnPC = ({ children }) => {
  React.useEffect(() => {
    if (isPC()) {
      toast('HEY! This app is designed for phone configurations, for better expereince either open this on phone or open the console to shrink the window size', {
        icon: '☺️',
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
    }
  }, []);
  return <>{children}</>;
};
export default ShowToastOnPC;