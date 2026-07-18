/** Vivid stage — Freya’s world in color, not clutter. */
export function LoginStageBackground() {
  return (
    <div className="login-atmosphere" aria-hidden>
      <div className="login-wash" />
      <div className="login-mesh" />
      <div className="login-aurora login-aurora-a" />
      <div className="login-aurora login-aurora-b" />
      <div className="login-aurora login-aurora-c" />
      <div className="login-aurora login-aurora-d" />

      <span className="login-blob login-blob-sky" />
      <span className="login-blob login-blob-mint" />
      <span className="login-blob login-blob-sun" />
      <span className="login-blob login-blob-coral" />

      <svg className="login-ribbons" viewBox="0 0 1000 700" fill="none" preserveAspectRatio="xMidYMid slice">
        <path
          className="login-ribbon login-ribbon-a"
          d="M-40 180 C 160 80, 320 220, 500 140 S 820 40, 1040 160"
        />
        <path
          className="login-ribbon login-ribbon-b"
          d="M-40 560 C 200 640, 380 480, 580 560 S 860 680, 1040 540"
        />
        <path
          className="login-orbit-path"
          d="M60 460 C 220 280, 400 240, 600 320 S 860 480, 960 400"
        />
        <circle className="login-orbit-bead" r="5" cx="0" cy="0">
          <animateMotion
            dur="15s"
            repeatCount="indefinite"
            path="M60 460 C 220 280, 400 240, 600 320 S 860 480, 960 400"
          />
        </circle>
      </svg>

      <div className="login-ring login-ring-a" />
      <div className="login-ring login-ring-b" />

      <div className="login-float login-float-msg">
        <div className="login-emblem login-emblem-msg">
          <span className="login-emblem-lines" />
          <span className="login-emblem-ping" />
        </div>
      </div>
      <div className="login-float login-float-post">
        <div className="login-emblem login-emblem-post">
          <span className="login-emblem-media" />
        </div>
      </div>
      <div className="login-float login-float-coin">
        <div className="login-emblem login-emblem-coin">$</div>
      </div>

      <div className="login-grain" />
    </div>
  )
}
