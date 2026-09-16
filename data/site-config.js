export const site = {

  meta: {

    titleTemplate: '{name}',
    description: 'Waterloo Computer Engineering',
    brandTag: 'PORTFOLIO',
    footerNote: '© 2026 Conan Yu',
  },

  // Navigation stuff
  nav: [
    { path: '/', label: 'Home' },
    { path: '/resume', label: 'Resume' },
  ],

  // Personal details
  person: {
    name: 'Conan Yu',
    tagline: 'Waterloo Computer Engineering student',

    bio: 'Hi, I\'m Conan. I like volleyball, (rhythm) games, puzzles and more! This is my portfolio. ',

    email: 'conanyu2@gmail.com',
    linkedinUrl: 'https://linkedin.com/in/conan-yu-2468b23ba/',
    githubUrl: 'https://github.com/ConanY123',

  
  },

  // Resume
  resume: {
    pdfPath: 'assets/resume/resume.pdf',   
    downloadName: 'Yu_Conan_Resume.pdf',
    lastUpdated: 'September 2026', 
  },


  // Projects
  projects: [
    { name: 'PawSture', url: 'https://github.com/kevinhshen/Five-Cat-PawSture' },
    { name: 'Denial Therapy', url: 'https://github.com/ConanY123/Denial-Therapy' },
    { name: 'My Portfolio', url: 'https://github.com/ConanY123/My-Portfolio' },
  ],


  copy: {
    home: {
      projectsLabel: 'Projects',
      secondaryCta: 'Read resume',
    },
  },


  // bg
  background: {

    defaultMode: 'osu',

    opacityDark: 0.5,

    fpsCap: 60,
  },
};

export default site;
