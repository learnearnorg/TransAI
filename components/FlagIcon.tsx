
import React from 'react';

interface FlagIconProps {
  country?: string;
  language?: string;
  className?: string;
}

const FlagIcon: React.FC<FlagIconProps> = ({ country, language, className = "w-5 h-5" }) => {
  const name = (country || language || '').toLowerCase();
  
  switch (name) {
    case 'auto-detect':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L14.45 8.45L21 10L14.45 11.55L12 18L9.55 11.55L3 10L9.55 8.45L12 2Z" fill="#4F46E5" />
          <path d="M19 15L20.15 17.85L23 19L20.15 20.15L19 23L17.85 20.15L15 19L17.85 17.85L19 15Z" fill="#A78BFA" />
          <path d="M5 3L5.85 5.15L8 6L5.85 6.85L5 9L4.15 6.85L2 6L4.15 5.15L5 3Z" fill="#A78BFA" />
        </svg>
      );
    case 'english':
    case 'united states':
      return (
        <svg className={className} viewBox="0 0 640 480">
          <path fill="#bd3d44" d="M0 0h640v480H0z"/>
          <path stroke="#fff" strokeWidth="37" d="M0 74h640M0 148h640M0 222h640M0 296h640M0 370h640M0 444h640"/>
          <path fill="#192f5d" d="M0 0h364v258H0z"/>
          <path fill="#fff" d="M31 17l4 13 13 0-11 8 4 13-10-8-10 8 4-13-11-8 13 0zM31 69l4 13 13 0-11 8 4 13-10-8-10 8 4-13-11-8 13 0zM31 121l4 13 13 0-11 8 4 13-10-8-10 8 4-13-11-8 13 0zM31 173l4 13 13 0-11 8 4 13-10-8-10 8 4-13-11-8 13 0zM31 225l4 13 13 0-11 8 4 13-10-8-10 8 4-13-11-8 13 0zM73 43l4 13 13 0-11 8 4 13-10-8-10 8 4-13-11-8 13 0zM73 95l4 13 13 0-11 8 4 13-10-8-10 8 4-13-11-8 13 0zM73 147l4 13 13 0-11 8 4 13-10-8-10 8 4-13-11-8 13 0zM73 199l4 13 13 0-11 8 4 13-10-8-10 8 4-13-11-8 13 0z"/>
        </svg>
      );
    case 'spanish':
    case 'spain':
      return (
        <svg className={className} viewBox="0 0 640 480">
          <path fill="#c60b1e" d="M0 0h640v120H0zm0 360h640v120H0z"/>
          <path fill="#ffc400" d="M0 120h640v240H0z"/>
        </svg>
      );
    case 'french':
    case 'france':
      return (
        <svg className={className} viewBox="0 0 640 480">
          <path fill="#fff" d="M0 0h640v480H0z"/>
          <path fill="#002395" d="M0 0h213.3v480H0z"/>
          <path fill="#ed2939" d="M426.7 0H640v480H426.7z"/>
        </svg>
      );
    case 'german':
    case 'germany':
      return (
        <svg className={className} viewBox="0 0 640 480">
          <path fill="#ffce00" d="M0 320h640v160H0z"/>
          <path d="M0 0h640v160H0z"/>
          <path fill="#d00" d="M0 160h640v160H0z"/>
        </svg>
      );
    case 'japanese':
    case 'japan':
      return (
        <svg className={className} viewBox="0 0 640 480">
          <path fill="#fff" d="M0 0h640v480H0z"/>
          <circle fill="#bc002d" cx="320" cy="240" r="144"/>
        </svg>
      );
    case 'korean':
    case 'korea':
      return (
        <svg className={className} viewBox="0 0 640 480">
          <path fill="#fff" d="M0 0h640v480H0z"/>
          <path fill="#000" d="M117 71l14-23 60 36-13 23zm42 66l14-23 60 37-14 23zm136 211l43 25-13 23-44-25zm42 67l43 25-13 22-44-25z"/>
          <circle fill="#cd2e3d" cx="320" cy="240" r="100"/>
          <path fill="#0047a0" d="M320 340a100 100 0 010-200 100 100 0 010 200z"/>
        </svg>
      );
    case 'chinese':
    case 'china':
      return (
        <svg className={className} viewBox="0 0 640 480">
          <path fill="#ee1c25" d="M0 0h640v480H0z"/>
          <path fill="#ffff00" d="M120 144l37-12 37 12-14-35 23-31-38-0-12-37-12 37-38 0 23 31zM236 57l2-14 13 6-11 8 4 13-10-8-10 8 4-13-11-8 13 0zM277 114l2-14 13 6-11 8 4 13-10-8-10 8 4-13-11-8 13 0zM277 186l2-14 13 6-11 8 4 13-10-8-10 8 4-13-11-8 13 0zM236 243l2-14 13 6-11 8 4 13-10-8-10 8 4-13-11-8 13 0z"/>
        </svg>
      );
    case 'russian':
    case 'russia':
      return (
        <svg className={className} viewBox="0 0 640 480">
          <path fill="#fff" d="M0 0h640v160H0z"/>
          <path fill="#0039a6" d="M0 160h640v160H0z"/>
          <path fill="#d52b1e" d="M0 320h640v160H0z"/>
        </svg>
      );
    case 'mongolian':
    case 'mongolia':
      return (
        <svg className={className} viewBox="0 0 640 480">
          <path fill="#0066b3" d="M213.3 0h213.4v480H213.3z"/>
          <path fill="#da2032" d="M0 0h213.3v480H0zm426.7 0H640v480H426.7z"/>
          <path fill="#ffde00" d="M50 140h113v15H50zm0 170h113v15H50zM106 120a25 25 0 110 50 25 25 0 010-50zM106 80c5-15 15-15 20 0s-15 15-20 0zM50 170h30v125H50zm83 0h30v125h-30zM106 200l25 35-25 35-25-35z"/>
        </svg>
      );
    default:
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" strokeWidth="2"/>
          <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" strokeWidth="2"/>
        </svg>
      );
  }
};

export default FlagIcon;
