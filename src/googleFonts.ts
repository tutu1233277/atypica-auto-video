export const GOOGLE_FONTS_ID = 'font-playground-google-fonts';
export const GOOGLE_FONTS_PRECONNECT = 'font-playground-google-fonts-preconnect';
export const GOOGLE_FONTS_PRECONNECT_CROSS =
  'font-playground-google-fonts-preconnect-cross';
export const GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Arizonia&family=Bonheur+Royale&family=Cantarell:ital,wght@0,400;0,700;1,400;1,700&family=Coming+Soon&family=Corinthia:wght@400;700&family=Ephesis&family=Estonia&family=Felipa&family=Gamja+Flower&family=Italianno&family=Kedebideri:wght@400;500;600;700;800;900&family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&family=Licorice&family=Love+Light&family=Lugrasimo&family=Merienda:wght@300..900&family=Mrs+Saint+Delafield&family=Nanum+Gothic&family=Norican&family=Roboto:ital,wght@0,100..900;1,100..900&family=Schoolbell&family=Shadows+Into+Light&family=Special+Elite&display=swap';

export const ensureGoogleFonts = () => {
  if (!document.getElementById(GOOGLE_FONTS_PRECONNECT)) {
    const preconnect = document.createElement('link');
    preconnect.id = GOOGLE_FONTS_PRECONNECT;
    preconnect.rel = 'preconnect';
    preconnect.href = 'https://fonts.googleapis.com';
    document.head.appendChild(preconnect);
  }

  if (!document.getElementById(GOOGLE_FONTS_PRECONNECT_CROSS)) {
    const preconnectCross = document.createElement('link');
    preconnectCross.id = GOOGLE_FONTS_PRECONNECT_CROSS;
    preconnectCross.rel = 'preconnect';
    preconnectCross.href = 'https://fonts.gstatic.com';
    preconnectCross.crossOrigin = 'anonymous';
    document.head.appendChild(preconnectCross);
  }

  if (!document.getElementById(GOOGLE_FONTS_ID)) {
    const stylesheet = document.createElement('link');
    stylesheet.id = GOOGLE_FONTS_ID;
    stylesheet.rel = 'stylesheet';
    stylesheet.href = GOOGLE_FONTS_HREF;
    document.head.appendChild(stylesheet);
  }
};

