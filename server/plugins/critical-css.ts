// Inject critical CSS directly into SSR HTML to prevent FOUC
// This runs as a Nitro plugin and modifies the rendered HTML before sending to client

const CRITICAL_CSS = `<style id="critical-css">
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Quicksand','Nunito',-apple-system,BlinkMacSystemFont,sans-serif;background:#0f0720;color:#f5f0ff;min-height:100vh;overflow-x:hidden;line-height:1.7;font-weight:500;font-size:1.05rem}
h1,h2,h3,h4,h5,h6{margin:0;font-weight:700;line-height:1.2}
a{color:#c084fc;text-decoration:none}
#app-root{min-height:100vh;position:relative}
#app-root>:not(.particles-bg){position:relative;z-index:2}
.particles-bg{position:fixed;top:0;left:0;width:100%;height:100%;z-index:1;pointer-events:none;overflow:hidden}
.particle{position:absolute;width:2px;height:2px;background:rgba(168,85,247,0.4);border-radius:50%;animation:sparkle-float 8s ease-in-out infinite}
.particle:nth-child(2n){background:rgba(244,114,182,0.35);width:1.5px;height:1.5px}
.particle:nth-child(3n){background:rgba(196,181,253,0.3);width:2.5px;height:2.5px}
.layout-game{min-height:100vh;position:relative;z-index:1;background:linear-gradient(180deg,#0f0720 0%,#160b2e 100%)}
.game-header{display:flex;align-items:center;justify-content:space-between;padding:14px 28px;background:rgba(168,85,247,0.05);backdrop-filter:blur(24px) saturate(1.3);-webkit-backdrop-filter:blur(24px) saturate(1.3);border:1px solid rgba(168,85,247,0.18);border-bottom:1px solid rgba(168,85,247,0.18);position:sticky;top:0;z-index:100}
.header-left{display:flex;align-items:center;gap:16px}
.header-right{display:flex;align-items:center;gap:12px}
.logo-mark{display:flex;align-items:center;gap:10px;text-decoration:none}
.logo-text{font-family:'Playfair Display',Georgia,serif;font-size:0.95rem;font-style:italic;background:linear-gradient(135deg,#e9d5ff,#f9a8d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-weight:700}
.btn-ghost{background:transparent;border:1px solid rgba(168,85,247,0.18);color:#f5f0ff;cursor:pointer;border-radius:10px;font-family:inherit}
.btn-sm{padding:7px 14px;font-size:0.75rem}
.user-name{font-size:0.85rem;color:#d4c6f5}
.badge-violet{background:rgba(168,85,247,0.15);color:#c084fc;padding:3px 10px;border-radius:100px;font-size:0.7rem;font-weight:600;border:1px solid rgba(168,85,247,0.18)}
.connection-dot{width:8px;height:8px;border-radius:50%;background:#fb7185}
.connection-dot.connected{background:#34d399;box-shadow:0 0 20px rgba(52,211,153,0.35)}
.user-info{display:flex;align-items:center;gap:8px}
.game-main{padding:28px;max-width:1400px;margin:0 auto;min-height:calc(100vh - 80px)}
.dashboard-screen{background:radial-gradient(ellipse at 30% 20%,rgba(147,51,234,0.12) 0%,transparent 50%),radial-gradient(ellipse at 70% 80%,rgba(244,114,182,0.08) 0%,transparent 50%),radial-gradient(ellipse at 50% 50%,rgba(107,33,168,0.2) 0%,transparent 70%)}
.welcome-section{text-align:center;padding:48px 0 36px}
.welcome-title{font-size:1.9rem;font-weight:700}
.welcome-sub{color:rgba(212,198,245,0.5);margin-top:8px;font-size:1.05rem;font-weight:500}
.text-gradient{font-family:'Playfair Display',Georgia,serif;font-style:italic;background:linear-gradient(135deg,#d8b4fe,#f9a8d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.quick-actions{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-bottom:40px;max-width:900px;margin-left:auto;margin-right:auto}
.action-card{background:rgba(168,85,247,0.05);backdrop-filter:blur(24px) saturate(1.3);-webkit-backdrop-filter:blur(24px) saturate(1.3);border:1px solid rgba(168,85,247,0.18);border-radius:24px;padding:18px 24px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px;cursor:pointer;color:inherit;position:relative;overflow:hidden}
.active-game{grid-column:1/-1}
.action-icon-wrap{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.18)}
.action-icon{font-size:26px;color:#c084fc}
.action-label{font-weight:600;font-size:0.95rem;color:#f5f0ff}
.action-desc{font-size:0.78rem;color:rgba(212,198,245,0.5)}
.section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
.section-title{font-family:'Playfair Display',Georgia,serif;font-size:1.3rem;font-style:italic}
.section-count{font-size:0.8rem;color:rgba(212,198,245,0.5)}
.games-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.glass-card{background:rgba(168,85,247,0.06);backdrop-filter:blur(24px) saturate(1.3);-webkit-backdrop-filter:blur(24px) saturate(1.3);border:1px solid rgba(168,85,247,0.18);border-radius:24px;padding:28px;box-shadow:0 8px 32px rgba(0,0,0,0.2),inset 0 1px 0 rgba(255,255,255,0.04)}
.empty-state{text-align:center;padding:60px 20px}
.empty-icon{font-size:2.5rem;margin-bottom:16px;opacity:0.6}
.empty-title{font-family:'Playfair Display',Georgia,serif;font-size:1.2rem;margin-bottom:8px}
.empty-desc{color:rgba(212,198,245,0.5);font-size:0.9rem;margin-bottom:24px}
.btn-primary{background:linear-gradient(135deg,#9333ea,#ec4899);color:#fff;border:none;padding:12px 28px;border-radius:16px;font-weight:600;cursor:pointer;font-family:inherit;font-size:0.95rem;display:inline-flex;align-items:center;gap:8px}
.login-screen{min-height:100vh;display:flex;align-items:center;justify-content:center;position:relative;background:radial-gradient(ellipse at 30% 20%,rgba(147,51,234,0.15) 0%,transparent 50%),radial-gradient(ellipse at 70% 80%,rgba(244,114,182,0.1) 0%,transparent 50%),radial-gradient(ellipse at 50% 50%,rgba(107,33,168,0.25) 0%,transparent 70%)}
.login-container{width:100%;max-width:420px;padding:0 24px;text-align:center;position:relative;z-index:2}
.login-title{font-family:'Playfair Display',Georgia,serif;font-size:2.2rem;font-style:italic;background:linear-gradient(135deg,#e9d5ff,#f9a8d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.login-subtitle{color:rgba(212,198,245,0.5);font-size:1rem;margin-top:4px}
.login-form{display:flex;flex-direction:column;gap:16px}
.form-group{text-align:left}
.form-group label{display:block;font-size:0.85rem;color:#d4c6f5;margin-bottom:6px;font-weight:500}
.input-wrapper{position:relative;display:flex;align-items:center}
.input{width:100%;background:rgba(168,85,247,0.08);border:1px solid rgba(168,85,247,0.18);border-radius:16px;padding:14px 16px 14px 44px;color:#f5f0ff;font-family:inherit;font-size:0.95rem}
.input-icon{position:absolute;left:14px;font-size:1rem;opacity:0.5}
.login-btn{width:100%;justify-content:center}
.login-divider{display:flex;align-items:center;justify-content:center;margin:24px 0}
.login-footer{margin-top:28px;color:rgba(212,198,245,0.5);font-size:0.82rem}
@media(max-width:768px){.quick-actions{grid-template-columns:1fr}.game-header{padding:10px 16px;flex-wrap:wrap;gap:8px}.game-main{padding:16px}}
@keyframes sparkle-float{0%{transform:translate3d(0,0,0);opacity:0}50%{opacity:1}100%{transform:translate3d(30px,-100vh,0);opacity:0}}
</style>`

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html) => {
    // Inject critical CSS right after <head> opening
    html.head.unshift(CRITICAL_CSS)
  })
})
