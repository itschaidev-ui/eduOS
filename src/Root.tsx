import React from 'react';
import { Composition } from 'remotion';
import { MyVideo } from './MyVideo';
import { LessonIntroVideo } from './LessonIntroVideo';
import { EduosVideo, eduosVideoTotalFrames } from './EduosVideo';

export const RemotionRoot: React.FC = () => {
	return (
		<>
			<Composition
				id="MyVideo"
				component={MyVideo}
				durationInFrames={300}
				fps={30}
				width={1920}
				height={1080}
				defaultProps={{
					title: 'Welcome to eduOS',
					subtitle: 'AI-Powered Learning Platform',
				}}
			/>
			<Composition
				id="LessonIntroVideo"
				component={LessonIntroVideo}
				durationInFrames={300}
				fps={30}
				width={1920}
				height={1080}
				defaultProps={{
					title: 'Introduction to React',
					description: 'Learn the fundamentals of React, including components, props, and state management.',
					topic: 'Web Development',
				}}
			/>
			<Composition
				id="EduosVideo"
				component={EduosVideo}
				durationInFrames={eduosVideoTotalFrames}
				fps={30}
				width={1920}
				height={1080}
				defaultProps={{
					title: 'eduOS',
					subtitle: 'Quirky Nova, Mentor Core, and every learning tool in one place.',
					tagline: 'Everything about eduOS in motion.',
				}}
			/>
		</>
	);
};
