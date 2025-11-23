import { useCallback, useRef } from 'react';

export const useChessSounds = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback((frequency: number, duration: number, volume: number = 0.3) => {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }, [getAudioContext]);

  const playMove = useCallback(() => {
    playTone(440, 0.1, 0.2);
  }, [playTone]);

  const playCapture = useCallback(() => {
    playTone(330, 0.15, 0.3);
    setTimeout(() => playTone(220, 0.1, 0.25), 50);
  }, [playTone]);

  const playCheck = useCallback(() => {
    playTone(660, 0.12, 0.3);
    setTimeout(() => playTone(880, 0.12, 0.3), 100);
  }, [playTone]);

  const playCheckmate = useCallback(() => {
    playTone(440, 0.15, 0.3);
    setTimeout(() => playTone(550, 0.15, 0.3), 150);
    setTimeout(() => playTone(660, 0.2, 0.35), 300);
    setTimeout(() => playTone(880, 0.3, 0.4), 450);
  }, [playTone]);

  const playGameStart = useCallback(() => {
    playTone(523, 0.15, 0.25);
    setTimeout(() => playTone(659, 0.2, 0.3), 150);
  }, [playTone]);

  const playCastle = useCallback(() => {
    playTone(392, 0.12, 0.25);
    setTimeout(() => playTone(523, 0.12, 0.25), 100);
  }, [playTone]);

  const playWheelSpin = useCallback(() => {
    playTone(220, 0.08, 0.15);
    setTimeout(() => playTone(330, 0.08, 0.15), 40);
    setTimeout(() => playTone(440, 0.08, 0.15), 80);
  }, [playTone]);

  const playWheelLock = useCallback(() => {
    playTone(880, 0.15, 0.35);
    setTimeout(() => playTone(660, 0.1, 0.3), 80);
  }, [playTone]);

  return {
    playMove,
    playCapture,
    playCheck,
    playCheckmate,
    playGameStart,
    playCastle,
    playWheelSpin,
    playWheelLock,
  };
};
