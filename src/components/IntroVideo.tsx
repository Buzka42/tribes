import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

const INTRO_SOURCE = require('../assets/intro.mp4');
const FADE_MS = 800;
const SAFETY_TIMEOUT_MS = 12000;

interface IntroVideoProps {
  onDone: () => void;
}

/** Fullscreen forest → campfire intro that plays once and fades into the app beneath it. */
export const IntroVideo: React.FC<IntroVideoProps> = ({ onDone }) => {
  const opacity = useRef(new Animated.Value(1)).current;
  const [dismissed, setDismissed] = useState(false);

  const player = useVideoPlayer(INTRO_SOURCE, (p) => {
    p.muted = true;
    p.loop = false;
    p.play();
  });

  const dismiss = () => {
    if (dismissed) return;
    setDismissed(true);
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start(() => onDone());
  };

  useEffect(() => {
    const sub = player.addListener('playToEnd', dismiss);
    const statusSub = player.addListener('statusChange', (status: any) => {
      if (status?.status === 'error') dismiss();
    });
    // Never let a stuck or missing asset trap the user on a black screen.
    const timeout = setTimeout(dismiss, SAFETY_TIMEOUT_MS);
    // The initial player.play() call (made before the source finishes
    // loading) can silently no-op on some platforms/environments — nudge it
    // again for the first couple seconds until playback actually starts.
    const kick = setInterval(() => {
      if (!player.playing) player.play();
    }, 200);
    const kickStop = setTimeout(() => clearInterval(kick), 2500);
    return () => {
      sub.remove();
      statusSub.remove();
      clearTimeout(timeout);
      clearInterval(kick);
      clearTimeout(kickStop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.container, { opacity }]}>
      <TouchableWithoutFeedback onPress={dismiss}>
        <View style={StyleSheet.absoluteFill}>
          <VideoView
            style={StyleSheet.absoluteFill}
            player={player}
            contentFit="cover"
            nativeControls={false}
            allowsPictureInPicture={false}
            playsInline
          />
        </View>
      </TouchableWithoutFeedback>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    zIndex: 9999,
    elevation: 9999,
  },
});
