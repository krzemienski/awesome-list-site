// Categories data
window.AV_CATEGORIES = [
  { id: 'community-events', name: 'Community & Events', short: 'Community', icon: '◈', count: 80,
    desc: 'Conferences, meetups, organizations and community-driven initiatives across the video industry.' },
  { id: 'encoding-codecs', name: 'Encoding & Codecs', short: 'Encoding', icon: '◇', count: 338,
    desc: 'Codecs, encoders, transcoders and the deep machinery of compressing video.' },
  { id: 'general-tools', name: 'General Tools', short: 'General', icon: '◆', count: 152,
    desc: 'General-purpose utilities, libraries and helpers for video workflows.' },
  { id: 'infrastructure-delivery', name: 'Infrastructure & Delivery', short: 'Infra', icon: '▣', count: 208,
    desc: 'CDNs, servers, packagers, caching layers and the infrastructure of delivery at scale.' },
  { id: 'intro-learning', name: 'Intro & Learning', short: 'Intro', icon: '▤', count: 210,
    desc: 'Tutorials, courses, books and primers to ramp up on video tech.' },
  { id: 'media-tools', name: 'Media Tools', short: 'Media', icon: '▥', count: 280,
    desc: 'Editors, frame analysis, ML pipelines and creative tooling.' },
  { id: 'players-clients', name: 'Players & Clients', short: 'Players', icon: '▶', count: 255,
    desc: 'Web, mobile and native players, plus client SDKs.' },
  { id: 'protocols-transport', name: 'Protocols & Transport', short: 'Protocols', icon: '⟁', count: 215,
    desc: 'HLS, DASH, RTMP, SRT, WebRTC — the wire formats and transport.' },
  { id: 'standards-industry', name: 'Standards & Industry', short: 'Standards', icon: '◉', count: 207,
    desc: 'Specs, standards bodies, working groups and industry references.' },
];

window.AV_TOTAL = 1953;
window.AV_TOTAL_SUBCATS = 102;
window.AV_TOTAL_USERS = 3;

window.AV_SUBCATEGORIES = {
  'community-events': [
    { id: 'conferences', name: 'Conferences', count: 24 },
    { id: 'meetups', name: 'Meetups', count: 18 },
    { id: 'organizations', name: 'Organizations', count: 22 },
    { id: 'newsletters', name: 'Newsletters & Blogs', count: 16 },
  ],
  'encoding-codecs': [
    { id: 'av1', name: 'AV1', count: 32 },
    { id: 'h264-h265', name: 'H.264 / H.265', count: 64 },
    { id: 'vp9', name: 'VP9', count: 18 },
    { id: 'ffmpeg-tools', name: 'FFmpeg-Based Tools', count: 48 },
    { id: 'encoding-tools', name: 'Encoding Tools', count: 95 },
    { id: 'transcoders', name: 'Transcoders', count: 81 },
  ],
  'general-tools': [
    { id: 'api-libraries', name: 'API Libraries & SDKs', count: 24 },
    { id: 'cli-utilities', name: 'CLI Utilities', count: 38 },
    { id: 'sample-streams', name: 'Test Content & Sample Streams', count: 18 },
    { id: 'libraries', name: 'General Libraries', count: 72 },
  ],
  'infrastructure-delivery': [
    { id: 'cdns', name: 'CDNs & Delivery', count: 42 },
    { id: 'live-streaming-servers', name: 'Live Streaming Servers', count: 38 },
    { id: 'packagers', name: 'Packagers & Origins', count: 34 },
    { id: 'cloud-services', name: 'Cloud Services', count: 48 },
    { id: 'caching', name: 'Caching & Edge', count: 46 },
  ],
  'intro-learning': [
    { id: 'video-fundamentals', name: 'Video Fundamentals', count: 56 },
    { id: 'streaming-protocols', name: 'Streaming Protocols Intro', count: 42 },
    { id: 'tutorials', name: 'Tutorials & Courses', count: 64 },
    { id: 'books', name: 'Books & Whitepapers', count: 48 },
  ],
  'media-tools': [
    { id: 'ai-machine-learning-tools', name: 'AI & Machine Learning Tools', count: 7 },
    { id: 'ads-qoe', name: 'Ads & QoE', count: 15 },
    { id: 'audio-subtitles', name: 'Audio & Subtitles', count: 14 },
    { id: 'audio-analysis-processing', name: 'Audio Analysis & Processing', count: 8 },
    { id: 'batch-processing-automation', name: 'Batch Processing & Automation', count: 4 },
    { id: 'color-grading-correction', name: 'Color Grading & Correction', count: 3 },
    { id: 'color-science-history', name: 'Color Science & History', count: 9 },
    { id: 'conversion-formatting', name: 'Conversion & Formatting', count: 1 },
    { id: 'effects-compositing', name: 'Effects & Compositing', count: 3 },
    { id: 'metadata-extraction', name: 'Metadata Extraction', count: 1 },
    { id: 'quality-analysis-metrics', name: 'Quality Analysis & Metrics', count: 4 },
    { id: 'scene-detection-segmentation', name: 'Scene Detection & Segmentation', count: 8 },
    { id: 'subtitle-caption-tools', name: 'Subtitle & Caption Tools', count: 8 },
    { id: 'vmaf-psnr-ssim-tools', name: 'VMAF PSNR SSIM Tools', count: 3 },
    { id: 'video-analytics-benchmarking', name: 'Video Analytics & Benchmarking', count: 7 },
  ],
  'players-clients': [
    { id: 'web-players', name: 'Web Players', count: 56 },
    { id: 'mobile-players', name: 'Mobile Players', count: 42 },
    { id: 'native-players', name: 'Native Players', count: 38 },
    { id: 'sdks', name: 'Player SDKs', count: 64 },
    { id: 'embed-tools', name: 'Embed & Widgets', count: 55 },
  ],
  'protocols-transport': [
    { id: 'adaptive-bitrate-algorithms', name: 'Adaptive Bitrate Algorithms', count: 8 },
    { id: 'adaptive-streaming', name: 'Adaptive Streaming', count: 36 },
    { id: 'transport-protocols', name: 'Transport Protocols', count: 22 },
    { id: 'webrtc', name: 'WebRTC', count: 28 },
    { id: 'rtmp-srt', name: 'RTMP & SRT', count: 24 },
  ],
  'standards-industry': [
    { id: 'mpeg', name: 'MPEG Standards', count: 38 },
    { id: 'ietf', name: 'IETF & RFC', count: 32 },
    { id: 'w3c', name: 'W3C Specs', count: 24 },
    { id: 'iso', name: 'ISO Standards', count: 28 },
    { id: 'industry-bodies', name: 'Industry Bodies', count: 38 },
  ],
};

// Sample resources
window.AV_RESOURCES = [
  { id: 1, title: '2025 NAB Show: CineCentral', cat: 'community-events', sub: 'conferences',
    desc: 'The 2025 NAB Show\'s CineCentral focuses on the interplay between tools, creative production, and the evolving video supply chain.',
    tags: ['nab', 'conference', 'cinema'], featured: true },
  { id: 2, title: 'ACM Mile-High Video 2025', cat: 'community-events', sub: 'conferences',
    desc: 'The ACM Mile-High Video conference features a comprehensive technical program on streaming media research.',
    tags: ['acm', 'research', 'conference'] },
  { id: 4, title: 'AMD Advanced Media Acceleration SDK', cat: 'encoding-codecs', sub: 'encoding-tools',
    desc: 'A comprehensive SDK from AMD that provides source codes for various media acceleration capabilities.',
    tags: ['amd', 'sdk', 'gpu'], featured: true },
  { id: 5, title: 'AMD Advanced Media Framework', cat: 'encoding-codecs', sub: 'encoding-tools',
    desc: 'AMD\'s GPU/Open Video SDK that provides developers access to GPU media engines.',
    tags: ['amd', 'amf', 'gpu'] },
  { id: 7, title: 'AWS SPEKE Reference Server', cat: 'general-tools', sub: 'api-libraries',
    desc: 'The Secure Packager and Encoder Key Exchange (SPEKE) reference server implementation.',
    tags: ['aws', 'drm', 'speke'] },
  { id: 8, title: 'AutoVideo', cat: 'general-tools', sub: 'libraries',
    desc: 'AutoVideo is a Python system designed for automated video action recognition.',
    tags: ['python', 'ml', 'automation'], featured: true },
  { id: 9, title: 'AviSynth', cat: 'general-tools', sub: 'cli-utilities',
    desc: 'AviSynth is a powerful scripting language designed for video post-production.',
    tags: ['scripting', 'editing'] },
  { id: 10, title: 'ffmpeg-python', cat: 'encoding-codecs', sub: 'ffmpeg-tools',
    desc: 'Python bindings for FFmpeg with a focus on ease of use and developer experience. Provides a fluent interface for complex FFmpeg operations.',
    tags: ['ffmpeg', 'python', 'bindings'], featured: true,
    url: 'https://github.com/ffmpeg-python/ffmpeg-python' },
  { id: 11, title: 'Galène', cat: 'infrastructure-delivery', sub: 'live-streaming-servers',
    desc: 'A modern videoconferencing server written in Go, with a focus on simplicity and security.',
    tags: ['go', 'webrtc', 'conferencing'] },
  { id: 12, title: 'LiveKit', cat: 'infrastructure-delivery', sub: 'live-streaming-servers',
    desc: 'Open-source platform for building real-time audio and video applications powered by WebRTC.',
    tags: ['webrtc', 'realtime', 'sdk'], featured: true,
    url: 'https://github.com/livekit/livekit' },
  { id: 13, title: 'shaka-player', cat: 'players-clients', sub: 'web-players',
    desc: 'JavaScript player library that plays adaptive media formats (such as DASH and HLS) in modern browsers.',
    tags: ['dash', 'hls', 'javascript'], featured: true },
  { id: 14, title: 'video.js', cat: 'players-clients', sub: 'web-players',
    desc: 'Open source HTML5 video player. Plays back HLS, DASH, MP4 and other formats.',
    tags: ['html5', 'player', 'web'] },
  { id: 15, title: 'hls.js', cat: 'players-clients', sub: 'web-players',
    desc: 'JavaScript HLS client using Media Source Extension. Plays Apple HTTP Live Streaming streams in modern browsers.',
    tags: ['hls', 'mse', 'javascript'], featured: true },
  { id: 16, title: 'RFC 8216: HTTP Live Streaming', cat: 'standards-industry', sub: 'ietf',
    desc: 'The IETF RFC that specifies HTTP Live Streaming (HLS), defining the playlist format (M3U8) and media segment structure.',
    tags: ['rfc', 'hls', 'ietf'] },
  { id: 17, title: 'MPEG-DASH ISO/IEC 23009', cat: 'standards-industry', sub: 'mpeg',
    desc: 'The international standard for Dynamic Adaptive Streaming over HTTP — the foundational MPEG-DASH specification.',
    tags: ['mpeg', 'dash', 'iso'] },
  { id: 18, title: 'GStreamer', cat: 'media-tools', sub: 'audio-analysis-processing',
    desc: 'GStreamer is a pipeline-based multimedia framework that links together a wide variety of media processing systems.',
    tags: ['pipeline', 'gstreamer', 'multimedia'], featured: true },
  { id: 19, title: 'OBS Studio', cat: 'media-tools', sub: 'effects-compositing',
    desc: 'Free and open source software for video recording and live streaming. Stream to Twitch, YouTube, and many other providers.',
    tags: ['streaming', 'recording', 'live'] },
  { id: 20, title: 'WebRTC.org', cat: 'protocols-transport', sub: 'webrtc',
    desc: 'The official WebRTC project — open framework for the web that enables Real-Time Communications in the browser.',
    tags: ['webrtc', 'realtime', 'browser'], featured: true },
  { id: 21, title: 'SRT Alliance', cat: 'protocols-transport', sub: 'rtmp-srt',
    desc: 'Secure Reliable Transport — open source video transport protocol for delivering high-quality, low-latency video across unpredictable networks.',
    tags: ['srt', 'transport', 'low-latency'] },
];

// Recent admin activity
window.AV_RECENT_ACTIVITY = [
  { id: 'TX#1', user: 'krzemienski', action: 'approved', target: 'ffmpeg-python', time: '2m ago', status: 'completed' },
  { id: 'TX#2', user: 'krzemienski', action: 'imported', target: 'awesome-video', time: '14m ago', status: 'completed' },
  { id: 'TX#3', user: 'system', action: 'sync', target: 'github.com/krzemienski/awesome-video', time: '1h ago', status: 'completed' },
  { id: 'TX#4', user: 'admin', action: 'updated', target: 'Encoding Tools', time: '2h ago', status: 'completed' },
  { id: 'TX#5', user: 'system', action: 'enrichment', target: 'batch #47', time: '3h ago', status: 'completed' },
  { id: 'TX#6', user: 'krzemienski', action: 'created', target: 'AI & ML Tools', time: '5h ago', status: 'completed' },
  { id: 'TX#7', user: 'system', action: 'link-check', target: '1953 resources', time: '8h ago', status: 'pending' },
  { id: 'TX#8', user: 'admin', action: 'rejected', target: 'Spam submission', time: '1d ago', status: 'failed' },
];

// Admin users
window.AV_USERS = [
  { id: 1, name: 'Test User', email: 'test@example.com', role: 'user', joined: 'Nov 18, 2025' },
  { id: 2, name: 'Admin User', email: 'admin@example.com', role: 'admin', joined: 'Nov 18, 2025' },
  { id: 3, name: 'Nick Krzemienski', email: 'krzemienski@gmail.com', role: 'admin', joined: 'Nov 18, 2025' },
];

// Research jobs
window.AV_RESEARCH_JOBS = [
  { id: 1, status: 'completed', prompt: 'Search for new video streaming...', found: 5, approved: '3/1', cost: '$0.4341', turns: '15/15', created: '2/11/2026' },
  { id: 2, status: 'completed', prompt: 'Find 3 new open-source vid...', found: 0, approved: '0/0', cost: '$0.1592', turns: '10/10', created: '2/11/2026' },
];

// Enrichment job history
window.AV_ENRICHMENT_JOBS = [
  { id: '#21', status: 'completed', started: '2/11/2026 10:58:34 PM', completed: '2/11/2026 11:02:00 PM' },
  { id: '#20', status: 'completed', started: '2/11/2026 10:50:34 PM', completed: '2/11/2026 10:54:00 PM' },
  { id: '#19', status: 'cancelled', started: '2/11/2026 10:42:13 PM', completed: '2/11/2026 10:43:00 PM' },
  { id: '#18', status: 'cancelled', started: '2/11/2026 10:38:45 PM', completed: '2/11/2026 10:39:00 PM' },
  { id: '#17', status: 'completed', started: '2/11/2026 10:25:11 PM', completed: '2/11/2026 10:31:00 PM' },
  { id: '#16', status: 'completed', started: '2/11/2026 10:10:43 PM', completed: '2/11/2026 10:14:00 PM' },
];

// Sync jobs
window.AV_SYNC_JOBS = [
  { id: 1, type: 'Import', status: 'pending' },
  { id: 2, type: 'Import', status: 'failed' },
  { id: 3, type: 'Import', status: 'pending' },
  { id: 4, type: 'Import', status: 'completed' },
  { id: 5, type: 'Export', status: 'completed' },
];
