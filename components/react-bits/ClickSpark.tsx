import React, { useRef, useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';

interface ClickSparkProps {
  children: React.ReactNode;
  sparkColor?: string;
  sparkSize?: number;
  sparkCount?: number;
  sparkRadius?: number;
  duration?: number;
  extraScale?: number;
}

interface Spark {
  id: number;
  x: number;
  y: number;
  angle: number;
  speed: number;
}

const ClickSpark: React.FC<ClickSparkProps> = ({
  children,
  sparkColor = '#fff',
  sparkSize = 10,
  sparkCount = 8,
  sparkRadius = 15,
  duration = 0.4,
  extraScale = 1.2
}) => {
  const [sparks, setSparks] = useState<Spark[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newSparks: Spark[] = Array.from({ length: sparkCount }).map((_, i) => ({
      id: Date.now() + i,
      x,
      y,
      angle: (i * 360) / sparkCount,
      speed: Math.random() * 0.5 + 0.5,
    }));

    setSparks(newSparks);
    
    // Clear sparks after animation
    setTimeout(() => {
        setSparks([]);
    }, duration * 1000);
  };

  return (
    <div 
        ref={containerRef} 
        onClick={handleClick} 
        className="relative inline-block"
        style={{ cursor: 'pointer' }}
    >
      {children}
      {sparks.map((spark) => (
        <motion.span
          key={spark.id}
          className="absolute rounded-full pointer-events-none"
          initial={{ 
              x: spark.x, 
              y: spark.y, 
              opacity: 1, 
              scale: 0 
          }}
          animate={{ 
              x: spark.x + Math.cos((spark.angle * Math.PI) / 180) * (sparkRadius * 2) * spark.speed, 
              y: spark.y + Math.sin((spark.angle * Math.PI) / 180) * (sparkRadius * 2) * spark.speed, 
              opacity: 0, 
              scale: 1 
          }}
          transition={{ duration: duration, ease: "easeOut" }}
          style={{
            width: sparkSize,
            height: sparkSize,
            backgroundColor: sparkColor,
            left: -sparkSize / 2, // Center the spark
            top: -sparkSize / 2,
          }}
        />
      ))}
    </div>
  );
};

export default ClickSpark;
