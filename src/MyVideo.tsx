import React from 'react';
import {
	AbsoluteFill,
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	Easing,
} from 'remotion';

interface MyVideoProps {
	title: string;
	subtitle: string;
}

const eduosHighlights = [
	'AI mentor Nova guiding onboarding & deep learning paths',
	'Interactive knowledge graphs, lessons, and Rabbit Holes',
	'Command Center with Mentor Core, tutorials, and squads',
	'Generative widgets, chaos battles, raids, and practice zones',
	'Firebase-backed progress tracking, squads, and co-op hubs',
	'Video-ready assets powered by Remotion for storytelling',
];

export const MyVideo: React.FC<MyVideoProps> = ({ title, subtitle }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
		easing: Easing.ease,
	});
	const contentOpacity = interpolate(frame, [40, 80], [0, 1], {
		easing: Easing.ease,
	});
	const featureIndex = Math.min(
		Math.floor(frame / 60),
		eduosHighlights.length - 1
	);
	const nextFeatureIndex = Math.min(featureIndex + 1, eduosHighlights.length - 1);
	const featureProgress = (frame % 60) / 60;

	const offsetY = interpolate(frame, [0, 30], [30, 0], {
		easing: Easing.ease,
	});

	const featureOpacity = interpolate(
		frame % 60,
		[0, 20, 40],
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
				backgroundColor: '#050505',
				padding: 60,
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'center',
				alignItems: 'center',
				gap: 60,
				fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
			}}
		>
			<div
				style={{
					textAlign: 'center',
					transform: `translateY(${offsetY}px)`,
					opacity: titleOpacity,
				}}
			>
				<h1
					style={{
						fontSize: 110,
						fontWeight: 700,
						color: '#f8fafc',
						margin: 0,
					}}
				>
					{title}
				</h1>
				<p
					style={{
						margin: 0,
						marginTop: 16,
						fontSize: 44,
						color: '#94a3b8',
					}}
				>
					{subtitle}
				</p>
			</div>

			<div
				style={{
					width: '100%',
					maxWidth: 1400,
					display: 'grid',
					gridTemplateColumns: '1fr 1fr',
					gap: 24,
					color: '#d0d5dd',
					opacity: contentOpacity,
				}}
			>
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: 16,
						padding: 32,
						background: 'linear-gradient(180deg, rgba(15,23,42,0.9), rgba(15,23,42,0.6))',
						border: '1px solid rgba(148,163,184,0.2)',
						borderRadius: 24,
						boxShadow: '0 20px 40px rgba(15,23,42,0.6)',
					}}
				>
					<span
						style={{
							fontSize: 18,
							letterSpacing: 2,
							textTransform: 'uppercase',
							color: '#94a3b8',
						}}
					>
						Command Center
					</span>
					<p
						style={{
							fontSize: 24,
							color: '#f1f5f9',
							margin: 0,
						}}
					>
						Synchronized Mentor Core, settings, tutorials, and cooperative squads.
					</p>
					<p
						style={{
							margin: 0,
							fontSize: 18,
						}}
					>
						{eduosHighlights[featureIndex]}
					</p>
					<p
						style={{
							margin: 0,
							fontSize: 16,
							color: '#94a3b8',
						}}
					>
						Next up: {eduosHighlights[nextFeatureIndex]}
					</p>
					<div
						style={{
							height: 6,
							borderRadius: 999,
							background: 'rgba(148,163,184,0.25)',
							overflow: 'hidden',
						}}
					>
						<div
							style={{
								width: `${featureProgress * 100}%`,
								height: '100%',
								background: 'linear-gradient(90deg, #22d3ee, #6366f1)',
								transition: 'width 0.3s ease',
							}}
						/>
					</div>
				</div>

				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: 16,
						padding: 32,
						background: 'linear-gradient(180deg, rgba(2,6,23,0.9), rgba(15,23,42,0.6))',
						border: '1px solid rgba(148,163,184,0.2)',
						borderRadius: 24,
						boxShadow: '0 20px 40px rgba(2,6,23,0.6)',
					}}
				>
					<span
						style={{
							fontSize: 18,
							letterSpacing: 2,
							textTransform: 'uppercase',
							color: '#94a3b8',
						}}
					>
						Infrastructure & Flow
					</span>
					<ul
						style={{
							margin: 0,
							paddingLeft: 20,
							display: 'flex',
							flexDirection: 'column',
							gap: 10,
						}}
					>
						<li>Firebase auth + Firestore for goals, squads, and persistence</li>
						<li>Gemini-powered Nova mentor & generative widgets stay responsive</li>
						<li>Vite + React 19 + Tailwind keep UI lightning fast</li>
						<li>Remotion-ready video scenes for lesson intros and recaps</li>
						<li>Three.js / OGL and Framer Motion bring the mentor universe to life</li>
					</ul>
					<p
						style={{
							margin: 0,
							fontSize: 18,
							color: '#a3e635',
						}}
					>
						Every part of eduOS is designed to teach + celebrate progress.
					</p>
				</div>
			</div>
		</AbsoluteFill>
	);
};
