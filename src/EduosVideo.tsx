import React from 'react';
import {
	AbsoluteFill,
	Sequence,
	useCurrentFrame,
	interpolate,
	Easing,
} from 'remotion';

const highlightItems = [
	'AI mentor Nova guiding onboarding & deep learning paths',
	'Interactive knowledge graphs, lessons & Rabbit Holes',
	'Command Center with Mentor Core, tutorials, and squads',
	'Generative widgets, chaos battles, raids, practice zones',
	'Firebase-auth + Firestore persistence for goals and squads',
	'Realtime Nova chat responses with Gemini + Tailwind / Vite speed',
	'Remotion-ready storytelling for lesson intros & recaps',
	'Three.js + Framer Motion visuals that animate mentor energy',
];

const commandCenterDetails = [
	'Mentor Core opens with Nova, settings, and tutorials',
	'Sidebar toggles stop flickering thanks to memoization',
	'Squads, raids, and chaos battles keep learners accountable',
	'The chatbox animates smoothly while the command center stays grounded',
];

const infraItems = [
	'React 19 + Vite w/ Tailwind for ultra-responsive UI',
	'Firebase Auth + Firestore for persistence + onboarding data',
	'Google Gemini handles Nova persona, knowledge graphs, lessons',
	'Remotion video-ready scenes + assets for storytelling',
	'Three.js / OGL + Framer Motion for mentor visuals + motion',
];

const sceneDurations = {
	title: 90,
	commandCenter: 120,
	highlights: 140,
	infrastructure: 120,
	closing: 80,
};

const TitleScene: React.FC<{ title: string; subtitle: string }> = ({
	title,
	subtitle,
}) => {
	const frame = useCurrentFrame();
	const titleOpacity = interpolate(frame, [0, 30], [0, 1], { easing: Easing.ease });
	const titleY = interpolate(frame, [0, 30], [40, 0], { easing: Easing.ease });
	const subtitleOpacity = interpolate(frame, [30, 60], [0, 1], { easing: Easing.ease });

	return (
		<AbsoluteFill
			style={{
				background:
					'linear-gradient(180deg, rgba(14,23,42,0.95), rgba(2,6,23,0.9))',
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				flexDirection: 'column',
				textAlign: 'center',
				padding: 60,
				gap: 24,
			}}
		>
			<div
				style={{
					opacity: titleOpacity,
					transform: `translateY(${titleY}px)`,
				}}
			>
				<h1
					style={{
						fontSize: 110,
						color: '#f8fafc',
						margin: 0,
						fontWeight: 700,
						letterSpacing: 1,
					}}
				>
					{title}
				</h1>
			</div>
			<div
				style={{
					opacity: subtitleOpacity,
					fontSize: 42,
					color: '#cbd5f5',
					maxWidth: 1000,
				}}
			>
				{subtitle}
			</div>
		</AbsoluteFill>
	);
};

const CommandCenterScene: React.FC = () => {
	const frame = useCurrentFrame();
	const progress = Math.min((frame % sceneDurations.commandCenter) / sceneDurations.commandCenter, 1);
	const glowOpacity = interpolate(frame % 60, [0, 30, 60], [0, 0.6, 0], {
		easing: Easing.ease,
	});

	return (
		<AbsoluteFill
			style={{
				background: 'rgba(15,23,42,0.92)',
				padding: 60,
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
			}}
		>
			<div
				style={{
					flex: 1,
					display: 'flex',
					flexDirection: 'column',
					gap: 16,
					padding: 48,
					background: 'rgba(8,15,26,0.9)',
					borderRadius: 32,
					boxShadow: '0 30px 60px rgba(2,6,23,0.7)',
					border: '1px solid rgba(148,163,184,0.2)',
				}}
			>
				<span
					style={{
						textTransform: 'uppercase',
						letterSpacing: 2,
						fontSize: 18,
						color: '#94a3b8',
					}}
				>
					Command Center
				</span>
				<h2
					style={{
						margin: 0,
						fontSize: 46,
						color: '#f8fafc',
					}}
				>
					Mentor Core keeps Nova on task.
				</h2>
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
						gap: 14,
					}}
				>
					{commandCenterDetails.map((detail) => (
						<div
							key={detail}
							style={{
								padding: 16,
								background: 'rgba(148,163,184,0.06)',
								borderRadius: 18,
								border: '1px solid rgba(168,185,212,0.2)',
								boxShadow: '0 15px 30px rgba(15,23,42,0.5)',
							}}
						>
							<p style={{ margin: 0, color: '#e2e8f0', fontSize: 17 }}>
								{detail}
							</p>
						</div>
					))}
				</div>
				<div
					style={{
						marginTop: 8,
						height: 8,
						borderRadius: 999,
						background: 'rgba(75,85,99,0.3)',
						overflow: 'hidden',
					}}
				>
					<div
						style={{
							height: '100%',
							width: `${progress * 100}%`,
							background:
								'linear-gradient(90deg, #06b6d4, #6366f1, #a855f7)',
							transition: 'width 0.3s ease',
						}}
					/>
				</div>
			</div>

			<div
				style={{
					flex: 0.4,
					height: '70%',
					marginLeft: 50,
					borderRadius: 26,
					background: 'rgba(15,23,42,0.8)',
					position: 'relative',
					overflow: 'hidden',
					border: '1px solid rgba(74,222,128,0.2)',
				}}
			>
				<div
					style={{
						position: 'absolute',
						inset: 0,
						background: 'radial-gradient(circle at 30% 20%, rgba(16,185,129,0.35), transparent 55%)',
						opacity: glowOpacity,
					}}
				/>
				<div
					style={{
						position: 'absolute',
						bottom: 24,
						left: 24,
						right: 24,
						display: 'flex',
						flexDirection: 'column',
						gap: 6,
					}}
				>
					<span
						style={{
							color: '#34d399',
							fontSize: 14,
							letterSpacing: 1.5,
						}}
					>
						Nova is thinking...
					</span>
					<div
						style={{
							height: 12,
							borderRadius: 999,
							background: 'rgba(148,163,184,0.3)',
						}}
					>
						<div
							style={{
								width: `${glowOpacity * 100}%`,
								height: '100%',
								background: 'linear-gradient(90deg, #22d3ee, #34d399)',
								transition: 'width 0.2s ease',
							}}
						/>
					</div>
					<p
						style={{
							color: '#e2e8f0',
							fontSize: 18,
							margin: 0,
						}}
					>
						Nova keeps the sidebar stable even when you toggle settings.
					</p>
				</div>
			</div>
		</AbsoluteFill>
	);
};

const HighlightsScene: React.FC = () => {
	const frame = useCurrentFrame();
	const featureIndex = Math.min(
		Math.floor(frame / 40),
		highlightItems.length - 1
	);
	const featureProgress = (frame % 40) / 40;

	return (
		<AbsoluteFill
			style={{
				background: 'linear-gradient(180deg, rgba(2,6,23,0.95), rgba(15,23,42,0.92))',
				padding: 60,
				display: 'flex',
				flexDirection: 'column',
				gap: 20,
			}}
		>
			<div>
				<h2
					style={{
						margin: 0,
						fontSize: 52,
						color: '#f8fafc',
					}}
				>
					eduOS highlights
				</h2>
				<p
					style={{
						margin: 0,
						color: '#94a3b8',
					}}
				>
					Every scene showcases the features that make eduOS feel alive.
				</p>
			</div>
			<div
				style={{
					flex: 1,
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
					gap: 18,
				}}
			>
				{highlightItems.map((item, idx) => {
					const active = idx === featureIndex;
					return (
						<div
							key={item}
							style={{
								padding: 20,
								background: active
									? 'rgba(14,165,233,0.25)'
									: 'rgba(148,163,184,0.08)',
								borderRadius: 20,
								border: active
									? '1px solid rgba(14,165,233,0.8)'
									: '1px solid rgba(148,163,184,0.2)',
								boxShadow: active
									? '0 20px 40px rgba(14,165,233,0.2)'
									: '0 12px 24px rgba(2,6,23,0.6)',
								transform: active
									? `translateY(${(1 - featureProgress) * -10}px)`
									: 'none',
								transition: 'transform 0.25s ease',
							}}
						>
							<p
								style={{
									margin: 0,
									fontSize: 20,
									color: active ? '#f8fafc' : '#e2e8f0',
									lineHeight: 1.4,
								}}
							>
								{item}
							</p>
						</div>
					);
				})}
			</div>
			<div
				style={{
					height: 8,
					borderRadius: 999,
					background: 'rgba(148,163,184,0.3)',
					overflow: 'hidden',
				}}
			>
				<div
					style={{
						width: `${(featureIndex + featureProgress) / highlightItems.length * 100}%`,
						height: '100%',
						background: 'linear-gradient(90deg, #22d3ee, #6366f1)',
						transition: 'width 0.2s ease',
					}}
				/>
			</div>
		</AbsoluteFill>
	);
};

const InfrastructureScene: React.FC = () => {
	return (
		<AbsoluteFill
			style={{
				background: 'linear-gradient(180deg, rgba(15,23,42,0.95), rgba(2,6,23,0.9))',
				padding: 60,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
			}}
		>
			<div
				style={{
					width: '100%',
					maxWidth: 1200,
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
					gap: 20,
				}}
			>
				{infraItems.map((item) => (
					<div
						key={item}
						style={{
							padding: 24,
							borderRadius: 22,
							background: 'rgba(30,41,59,0.8)',
							border: '1px solid rgba(94,234,212,0.2)',
							boxShadow: '0 25px 45px rgba(2,6,23,0.65)',
						}}
					>
						<p
							style={{
								margin: 0,
								fontSize: 20,
								color: '#e2e8f0',
							}}
						>
							{item}
						</p>
					</div>
				))}
			</div>
		</AbsoluteFill>
	);
};

const ClosingScene: React.FC<{ tagline: string }> = ({ tagline }) => {
	const frame = useCurrentFrame();
	const opacity = interpolate(frame, [0, 30], [0, 1], { easing: Easing.ease });
	const scale = interpolate(frame, [0, 30], [0.8, 1], { easing: Easing.out(Easing.ease) });

	return (
		<AbsoluteFill
			style={{
				background:
					'linear-gradient(180deg, rgba(15,23,42,0.95), rgba(2,6,23,0.9))',
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				textAlign: 'center',
				padding: 40,
			}}
		>
			<div
				style={{
					opacity,
					transform: `scale(${scale})`,
					maxWidth: 1100,
				}}
			>
				<h1
					style={{
						fontSize: 86,
						color: '#f8fafc',
						margin: 0,
					}}
				>
					{tagline}
				</h1>
				<p
					style={{
						marginTop: 18,
						fontSize: 26,
						color: '#94a3b8',
					}}
				>
					eduOS blends Nova, Gemini, Firebase, and Remotion into the most human
					version of mentorship.
				</p>
			</div>
		</AbsoluteFill>
	);
};

interface EduosVideoProps {
	title: string;
	subtitle: string;
	tagline: string;
}

export const EduosVideo: React.FC<EduosVideoProps> = ({
	title,
	subtitle,
	tagline,
}) => {
	return (
		<AbsoluteFill>
			<Sequence durationInFrames={sceneDurations.title}>
				<TitleScene title={title} subtitle={subtitle} />
			</Sequence>
			<Sequence from={sceneDurations.title} durationInFrames={sceneDurations.commandCenter}>
				<CommandCenterScene />
			</Sequence>
			<Sequence
				from={sceneDurations.title + sceneDurations.commandCenter}
				durationInFrames={sceneDurations.highlights}
			>
				<HighlightsScene />
			</Sequence>
			<Sequence
				from={
					sceneDurations.title +
					sceneDurations.commandCenter +
					sceneDurations.highlights
				}
				durationInFrames={sceneDurations.infrastructure}
			>
				<InfrastructureScene />
			</Sequence>
			<Sequence
				from={
					sceneDurations.title +
					sceneDurations.commandCenter +
					sceneDurations.highlights +
					sceneDurations.infrastructure
				}
				durationInFrames={sceneDurations.closing}
			>
				<ClosingScene tagline={tagline} />
			</Sequence>
		</AbsoluteFill>
	);
};

export const eduosVideoTotalFrames =
	sceneDurations.title +
	sceneDurations.commandCenter +
	sceneDurations.highlights +
	sceneDurations.infrastructure +
	sceneDurations.closing;
