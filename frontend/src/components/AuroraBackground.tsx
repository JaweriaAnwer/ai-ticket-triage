import { motion } from "framer-motion";

const blobs = [
  { id: 'KK8NbMBf', url: 'https://userdata.jitter.video/7c44487f-0054-4847-8568-7e3866fe6a9f.png', initial: { x: 886, y: 701 }, anim: { x: [886, 600, 1000, 886], y: [701, 500, 900, 701] } },
  { id: 'n1diwvg6', url: 'https://userdata.jitter.video/14f4e33f-a762-4349-8d28-587ad857334b.png', initial: { x: 245, y: 819 }, anim: { x: [245, 500, -100, 245], y: [819, 600, 1000, 819] } },
  { id: 'oTQaTk9y', url: 'https://userdata.jitter.video/083a2b21-2783-4005-b2ab-0b2e04b6d218.png', initial: { x: 1163, y: 978 }, anim: { x: [1163, 1000, 1300, 1163], y: [978, 400, 800, 978] } },
  { id: 'zB2Sbwgg', url: 'https://userdata.jitter.video/14f4e33f-a762-4349-8d28-587ad857334b.png', initial: { x: -257, y: 362 }, anim: { x: [-257, 100, -300, -257], y: [362, 500, 100, 362] } },
  { id: 'vWMmT4on', url: 'https://userdata.jitter.video/e8f67ac1-4f1d-4ebf-ae4d-c404cecf0bc7.png', initial: { x: 465, y: 0 }, anim: { x: [465, 800, 200, 465], y: [0, 300, -100, 0] } },
  { id: 'mBatImgX', url: 'https://userdata.jitter.video/083a2b21-2783-4005-b2ab-0b2e04b6d218.png', initial: { x: 784, y: 1012 }, anim: { x: [784, 500, 900, 784], y: [1012, 1200, 800, 1012] } },
  { id: 'BWfkewLO', url: 'https://userdata.jitter.video/55dfbf5b-e29a-450a-bd44-b5d47da737c2.png', initial: { x: 1265, y: 825 }, anim: { x: [1265, 900, 1400, 1265], y: [825, 600, 1000, 825] } },
  { id: 'ur2w55FH', url: 'https://userdata.jitter.video/9cdd9299-dad4-4d1c-b11e-061df69ced82.png', initial: { x: -191, y: 161 }, anim: { x: [-191, 200, -400, -191], y: [161, 300, 50, 161] } }
];

export function AuroraBackground() {
  return (
    <div className="fixed inset-0 w-full h-full z-[-1] overflow-hidden bg-black pointer-events-none select-none">
      {blobs.map((blob, index) => (
        <motion.img
          key={blob.id}
          src={blob.url}
          alt=""
          className="absolute opacity-60 mix-blend-screen"
          style={{ 
            width: "1600px", 
            height: "1600px", 
            left: '50%',
            top: '50%',
            marginLeft: '-800px',
            marginTop: '-800px',
            filter: 'blur(60px)' 
          }}
          initial={{
            x: blob.initial.x - 960, // Normalize to center of 1920x1080
            y: blob.initial.y - 540,
            scale: 1.2
          }}
        />
      ))}
      
      {/* Heavy noise/overlay layer to give it a premium texture */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />
    </div>
  );
}
