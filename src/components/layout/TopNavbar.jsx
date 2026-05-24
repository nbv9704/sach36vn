import { Link, NavLink } from 'react-router-dom';
import { ExternalLink, LogOut, Search, User } from 'lucide-react';
import { SPORT_NAV } from '../../config/navigation';
import { CurrencyIcon } from '../common/CurrencyAmount';

export function TopNavbar({ user, balance, isAdmin, onLogin, onLogout, searchQuery, onSearchChange }) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-[#2a2e38] bg-[#16181f]">
      <div className="flex h-16 items-center justify-between gap-3 px-3 sm:px-5">
        <Link to="/" className="flex shrink-0 items-center gap-2 rounded-md pr-1 text-white" aria-label="Go home">
          <img src="/favicon.png" alt="Sach36VN" className="h-13 w-13 rounded-md object-contain" />
        </Link>
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" aria-label="Sports navigation">
          {SPORT_NAV.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={label}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wide transition ${isActive ? 'bg-[#ffd200] text-black' : 'text-[#8a8e99] hover:bg-[#22252e] hover:text-white'
                }`
              }
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <label className="hidden items-center gap-2 rounded-md bg-[#22252e] px-3 py-2 md:flex">
            <Search size={16} className="text-[#8a8e99]" />
            <input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search teams"
              className="w-40 bg-transparent text-sm text-white outline-none placeholder:text-[#8a8e99]"
            />
          </label>
          <button type="button" className="rounded-md p-2 text-[#8a8e99] transition hover:bg-[#22252e] hover:text-white md:hidden" aria-label="Search">
            <Search size={18} />
          </button>
          <Link to="/balance" className="hidden items-center gap-2 rounded-md bg-[#22252e] px-3 py-2 transition hover:bg-[#2a2e38] sm:flex" aria-label="Open balance">
            <CurrencyIcon className="h-5 w-5" />
            <span className="font-mono text-sm font-bold text-white">{Number(balance || 0).toLocaleString()}</span>
          </Link>
          {user ? (
            <div className="flex items-center gap-2 rounded-md bg-[#22252e] p-1.5">
              {isAdmin && (
                <Link to="/admin/results" className="rounded px-2 py-1.5 text-xs font-black uppercase text-[#ffd200] hover:bg-[#2a2e38]">
                  Admin
                </Link>
              )}
              <Link to="/my-bets" className="flex h-8 w-8 items-center justify-center overflow-hidden rounded bg-[#2a2e38] text-[#ffd200] transition hover:ring-1 hover:ring-[#ffd200]" aria-label="Open my bets">
                {user.user_metadata.avatar_url ? (
                  <img className="h-full w-full object-cover" src={user.user_metadata.avatar_url} alt="Discord avatar" />
                ) : (
                  <User size={15} />
                )}
              </Link>
              <button type="button" onClick={onLogout} className="rounded p-1.5 text-[#8a8e99] hover:text-[#ef4444]" aria-label="Logout">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={onLogin} className="flex items-center gap-2 rounded-md bg-[#22252e] px-3 py-2 text-xs font-bold uppercase text-white hover:bg-[#2a2e38]">
              <ExternalLink size={15} />
              <span className="hidden sm:inline">Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
