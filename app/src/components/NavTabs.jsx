export default function NavTabs({ tabs, active, onChange }) {
  return (
    <nav className="safe-bottom border-t border-lavanda-100 bg-crema-50/95 backdrop-blur">
      <ul className="flex justify-between px-1">
        {Object.entries(tabs).map(([key, tab]) => {
          const isActive = key === active
          return (
            <li key={key} className="flex-1">
              <button
                onClick={() => onChange(key)}
                className={`flex w-full flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                  isActive ? 'text-lavanda-700' : 'text-morado-900/40'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={`text-xl leading-none ${key === 'sos' ? '' : ''}`}>{tab.icon}</span>
                <span>{tab.label}</span>
                {isActive && <span className="mt-0.5 h-1 w-1 rounded-full bg-lavanda-500" />}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
