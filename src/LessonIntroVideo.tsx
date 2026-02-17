import React from 'react';
import {
	AbsoluteFill,
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	Easing,
	Sequence,
} from 'remotion';

interface LessonIntroVideoProps {
	title: string;
	description: string;
	topic: string;
}

export const LessonIntroVideo: React.FC<LessonIntroVideoProps> = ({
	title,
	description,
	topic,
}) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	// Title animation (frames 0-60)
	const titleOpacity = interpolate(
		frame,
		[0, 30, 60],
		[0, 1, 1],
		{
			easing: Easing.ease,
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		}
	);

	const titleScale = interpolate(
		frame,
		[0, 60],
		[0.8, 1],
		{
			easing: Easing.ease,
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		}
	);

	// Topic badge animation (frames 60-90)
	const topicOpacity = interpolate(
		frame,
		[60, 90],
		[0, 1],
		{
			easing: Easing.ease,
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		}
	);

	// Description animation (frames 90-150)
	const descriptionOpacity = interpolate(
		frame,
		[90, 120, 150],
		[0, 1, 1],
		{
			easing: Easing.ease,
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		}
	);

	return (
		<AbsoluteFill
			style={{
				backgroundColor: '#0a0a0a',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'center',
				alignItems: 'center',
				fontFamily: 'system-ui, -apple-system, sans-serif',
				padding: 80,
			}}
		>
			{/* Title */}
			<div
				style={{
					opacity: titleOpacity,
					transform: `scale(${titleScale})`,
					textAlign: 'center',
					marginBottom: 60,
				}}
			>
				<h1
					style={{
						fontSize: 96,
						fontWeight: 'bold',
						color: '#ffffff',
						margin: 0,
						lineHeight: 1.2,
					}}
				>
					{title}
				</h1>
			</div>

			{/* Topic Badge */}
			<div
				style={{
					opacity: topicOpacity,
					marginBottom: 40,
				}}
			>
				<div
					style={{
						display: 'inline-block',
						padding: '12px 24px',
						backgroundColor: '#27272a',
						border: '1px solid #3f3f46',
						borderRadius: 8,
					}}
				>
					<span
						style={{
							fontSize: 18,
							color: '#a1a1aa',
							textTransform: 'uppercase',
							letterSpacing: 2,
							fontWeight: 600,
						}}
					>
						{topic}
					</span>
				</div>
			</div>

			{/* Description */}
			<div
				style={{
					opacity: descriptionOpacity,
					textAlign: 'center',
					maxWidth: 800,
				}}
			>
				<p
					style={{
						fontSize: 32,
						color: '#d4d4d8',
						margin: 0,
						lineHeight: 1.6,
					}}
				>
					{description}
				</p>
			</div>
		</AbsoluteFill>
	);
};
