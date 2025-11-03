'use client';

import React, { useEffect, useRef } from 'react';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export default function QRCode({ value, size = 128, className = '' }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      // Simple QR code placeholder - in a real implementation, you'd use a QR code library
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Clear canvas
        ctx.clearRect(0, 0, size, size);
        
        // Draw a simple QR code pattern (placeholder)
        ctx.fillStyle = '#000000';
        const moduleSize = size / 25; // 25x25 grid
        
        // Draw corner squares
        for (let i = 0; i < 7; i++) {
          for (let j = 0; j < 7; j++) {
            if ((i < 3 && j < 3) || (i < 3 && j > 3) || (i > 3 && j < 3)) {
              ctx.fillRect(i * moduleSize, j * moduleSize, moduleSize, moduleSize);
            }
          }
        }
        
        // Draw some random pattern in the middle (placeholder)
        for (let i = 7; i < 18; i++) {
          for (let j = 7; j < 18; j++) {
            if ((i + j) % 3 === 0) {
              ctx.fillRect(i * moduleSize, j * moduleSize, moduleSize, moduleSize);
            }
          }
        }
        
        // Draw bottom right corner
        for (let i = 18; i < 25; i++) {
          for (let j = 18; j < 25; j++) {
            if ((i < 21 && j < 21) || (i < 21 && j > 21) || (i > 21 && j < 21)) {
              ctx.fillRect(i * moduleSize, j * moduleSize, moduleSize, moduleSize);
            }
          }
        }
      }
    }
  }, [value, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`border border-gray-300 rounded ${className}`}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
