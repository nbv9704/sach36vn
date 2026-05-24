import { Flame, Home, Star } from 'lucide-react';
import { IoMdFootball } from 'react-icons/io';
import { SiCounterstrike, SiLeagueoflegends, SiValorant } from 'react-icons/si';

export const SPORT_NAV = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Live', path: '/live', icon: Flame },
  { label: 'Favorites', path: '/favorites', icon: Star },
  { label: 'CS2', path: '/category/csgo', icon: SiCounterstrike },
  { label: 'LoL', path: '/category/lol', icon: SiLeagueoflegends },
  { label: 'Valorant', path: '/category/valorant', icon: SiValorant },
  { label: 'Soccer', path: '/category/football', icon: IoMdFootball },
];
