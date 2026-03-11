export type StoreLink = {
  label: string;
  href?: string;
  external?: boolean;
  disabled?: boolean;
};

export type GameEntry = {
  title: string;
  subtitle: string;
  description: string;
  image: string;
  imageAlt: string;
  primaryHref?: string;
  links: StoreLink[];
};

export type SingleFlowNavItem = {
  id: string;
  label: string;
  kind: 'section' | 'action' | 'external';
  href?: string;
  sectionId?: string;
  action?: 'open-contact';
  iconClass: string;
};

export type SocialLink = {
  label: string;
  href: string;
  iconClass: string;
};

export const SINGLE_FLOW_NAV_ITEMS: SingleFlowNavItem[] = [
  {
    id: 'profile',
    label: 'Profile',
    kind: 'section',
    href: '#profile',
    sectionId: 'profile',
    iconClass: 'fa-solid fa-house'
  },
  {
    id: 'family',
    label: 'Family',
    kind: 'section',
    href: '#family',
    sectionId: 'family',
    iconClass: 'fa-solid fa-user'
  },
  {
    id: 'vision',
    label: 'Vision',
    kind: 'section',
    href: '#vision',
    sectionId: 'vision',
    iconClass: 'fa-solid fa-compass-drafting'
  },
  {
    id: 'ai',
    label: 'AI',
    kind: 'section',
    href: '#ai',
    sectionId: 'ai',
    iconClass: 'fa-solid fa-wand-magic-sparkles'
  },
  {
    id: 'games',
    label: 'Games',
    kind: 'section',
    href: '#games',
    sectionId: 'games',
    iconClass: 'fa-solid fa-gamepad'
  },
  {
    id: 'support',
    label: 'Support',
    kind: 'section',
    href: '#support',
    sectionId: 'support',
    iconClass: 'fa-brands fa-paypal'
  },
  {
    id: 'contact',
    label: 'Contact',
    kind: 'action',
    action: 'open-contact',
    iconClass: 'fa-solid fa-envelope'
  }
];

export const SOCIAL_LINKS: SocialLink[] = [
  {
    label: 'Discord',
    href: 'https://discord.gg/dKaEy6MFCP',
    iconClass: 'fa-brands fa-discord'
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@blindsidedgames',
    iconClass: 'fa-brands fa-youtube'
  },
  {
    label: 'X',
    href: 'https://twitter.com/BlindsidedGames',
    iconClass: 'fa-brands fa-x-twitter'
  },
  {
    label: 'itch.io',
    href: 'https://blindsidedgames.itch.io/',
    iconClass: 'fa-brands fa-itch-io'
  }
];

export const FEATURED_RELEASE = {
  badge: 'Featured Release',
  title: 'Echoes of Vasteria',
  subtitle: 'Pixel-art auto-adventure with idle depth and side-scrolling action.',
  image: '/img/Echoes of Vasteria.png',
  imageAlt: 'Echoes of Vasteria artwork',
  links: [
    {
      label: 'Steam',
      href: 'https://store.steampowered.com/app/2940000/Echoes_of_Vasteria/',
      external: true
    },
    { label: 'Official Site', href: 'https://echoesofvasteria.com/', external: true }
  ]
} as const;

export const GAME_PORTFOLIO: GameEntry[] = [
  {
    title: 'The Daily Quiz',
    subtitle: 'Coming soon on mobile',
    description:
      'A polished daily trivia app with official packs, quick-start runs, self-eval or multi-choice play, and a rotating daily challenge feed.',
    image: '/img/the-daily-quiz-icon.png',
    imageAlt: 'The Daily Quiz app icon',
    links: [{ label: 'Coming Soon', disabled: true }]
  },
  {
    title: 'Eternum Inc',
    subtitle: 'Idle incremental',
    description:
      'Production-focused incremental design with long-tail progression tuned for mobile sessions.',
    image: '/img/EternumInc.webp',
    imageAlt: 'Eternum Inc cover image',
    primaryHref: 'https://apps.apple.com/au/app/eternum-inc/id6741140312',
    links: [
      {
        label: 'iOS',
        href: 'https://apps.apple.com/au/app/eternum-inc/id6741140312',
        external: true
      },
      {
        label: 'Google Play',
        href: 'https://play.google.com/store/apps/details?id=com.blindsidedgames.idleeternum&hl=en_AU',
        external: true
      }
    ]
  },
  {
    title: 'Nebula Navigator',
    subtitle: 'Incremental space warfare',
    description: 'Fleet progression, combat loops, and strategic scaling in a streamlined UX shell.',
    image: '/img/Nebula%20Navigator.webp',
    imageAlt: 'Nebula Navigator cover image',
    primaryHref: 'https://apps.apple.com/au/app/nebula-navigator/id6477858262',
    links: [
      {
        label: 'iOS',
        href: 'https://apps.apple.com/au/app/nebula-navigator/id6477858262',
        external: true
      },
      {
        label: 'Google Play',
        href: 'https://play.google.com/store/apps/details?id=com.blindsidedgames.nebulanavigator&hl=en_AU',
        external: true
      }
    ]
  },
  {
    title: 'Idle Dyson Swarm: Nanite',
    subtitle: 'Idle strategy',
    description:
      'Expands the Dyson Swarm lineage with deeper strategic tradeoffs and cleaner progression pacing.',
    image: '/img/IdsNanite.webp',
    imageAlt: 'Idle Dyson Swarm: Nanite cover image',
    primaryHref: 'https://apps.apple.com/si/app/idle-dyson-swarm-nanite/id6526468962',
    links: [
      {
        label: 'iOS',
        href: 'https://apps.apple.com/si/app/idle-dyson-swarm-nanite/id6526468962',
        external: true
      },
      {
        label: 'Google Play',
        href: 'https://play.google.com/store/apps/details?id=com.blindsidedgames.idledysonswarmnanite&hl=en_AU',
        external: true
      }
    ]
  },
  {
    title: 'Skrimp Fall',
    subtitle: 'Incremental simulation physics',
    description: 'Chaotic physics-driven progression layered with idle-style upgrade loops.',
    image: '/img/SkrimpFall.gif',
    imageAlt: 'Skrimp Fall cover image',
    primaryHref: '/games/skrimpfall.html',
    links: [
      {
        label: 'iOS',
        href: 'https://apps.apple.com/us/app/skrimp-fall/id6447680173',
        external: true
      },
      {
        label: 'Google Play',
        href: 'https://play.google.com/store/apps/details?id=com.blindsidedgames.skrimpdrop',
        external: true
      }
    ]
  },
  {
    title: 'Idle Dyson Swarm',
    subtitle: 'Incremental strategy',
    description:
      'A long-running idle strategy release available across mobile and desktop storefronts.',
    image: '/img/IdleDysonSwarm.png',
    imageAlt: 'Idle Dyson Swarm cover image',
    primaryHref: '/games/idledysonswarm.html',
    links: [
      {
        label: 'iOS',
        href: 'https://apps.apple.com/au/app/idle-dyson-swarm/id1631060225',
        external: true
      },
      {
        label: 'Google Play',
        href: 'https://play.google.com/store/apps/details?id=com.blindsidedgames.idledysonswarm&hl=en&gl=US',
        external: true
      },
      {
        label: 'Mac',
        href: 'https://apps.apple.com/au/app/idle-dyson-swarm/id1631060225',
        external: true
      },
      {
        label: 'itch.io',
        href: 'https://blindsidedgames.itch.io/idle-dyson-swarm',
        external: true
      }
    ]
  },
  {
    title: 'Idle Sheep Counting',
    subtitle: 'Incremental strategy',
    description: 'Relaxed session design with compounding systems built for consistent daily play.',
    image: '/img/Idle%20Sheep%20Counting.webp',
    imageAlt: 'Idle Sheep Counting cover image',
    primaryHref: '/games/idlesheepcounting.html',
    links: [
      {
        label: 'iOS',
        href: 'https://apps.apple.com/au/app/idle-sheep-counter/id1639432790',
        external: true
      },
      {
        label: 'Google Play',
        href: 'https://play.google.com/store/apps/details?id=com.blindsidedgames.countingsheep&hl=en_AU&gl=US',
        external: true
      }
    ]
  },
  {
    title: 'Idle Spaceflight',
    subtitle: 'Incremental strategy',
    description: 'Space progression systems focused on readable pacing and persistent advancement.',
    image: '/img/IdleSpaceflight.png',
    imageAlt: 'Idle Spaceflight cover image',
    primaryHref: '/games/idle-spaceflight.html',
    links: [
      {
        label: 'iOS',
        href: 'https://apps.apple.com/au/app/idle-spaceflight/id1538856127',
        external: true
      }
    ]
  },
  {
    title: 'Rocket Mania',
    subtitle: 'Racing, exploration, 2D platformer',
    description: 'Arcade movement and route mastery with support across mobile and Steam.',
    image: '/img/RocketMania.png',
    imageAlt: 'Rocket Mania cover image',
    primaryHref: '/games/rocketmania.html',
    links: [
      {
        label: 'iOS',
        href: 'https://apps.apple.com/au/app/rocketmania/id1622522530',
        external: true
      },
      {
        label: 'Google Play',
        href: 'https://play.google.com/store/apps/details?id=com.BlindsidedGames.RocketMania&hl=en&gl=US',
        external: true
      },
      {
        label: 'Steam',
        href: 'https://store.steampowered.com/app/1949810/Rocket_Mania/',
        external: true
      }
    ]
  },
  {
    title: 'Edge-Spawn TD',
    subtitle: 'Browser prototype tower defense',
    description: 'Experimental defense sandbox used to test encounter design and economy pacing.',
    image: '/img/EdgeSpawnTD.png',
    imageAlt: 'Edge-Spawn TD prototype cover image',
    primaryHref: '/games/edge-spawn-td.html',
    links: [{ label: 'Play Prototype', href: '/games/edge-spawn-td.html' }]
  }
];

export const ORGANIZATION_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Blindsided Games',
  url: 'https://blindsidedgames.com',
  logo: 'https://blindsidedgames.com/img/logo.jpg',
  founder: {
    '@type': 'Person',
    name: 'Matthew Rushworth'
  },
  sameAs: SOCIAL_LINKS.map((socialLink) => socialLink.href)
} as const;
