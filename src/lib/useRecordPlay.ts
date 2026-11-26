import { useCallback, useState } from 'react';
import { badgeFor, recordPlay, type NewPlay } from './scores';

/**
 * Saves a finished game to the leaderboard and gives back a badge line for
 * the win popup ("🏆 New top score!") once the save finishes.
 *
 *   const [badge, record, clearBadge] = useRecordPlay();
 *   record({ game: 'sliding', won: true, moves, hints });
 */
export const useRecordPlay = () => {
  const [badge, setBadge] = useState<string | undefined>(undefined);

  const record = useCallback((play: NewPlay) => {
    setBadge(undefined);
    recordPlay(play)
      .then((result) => setBadge(badgeFor(result)))
      .catch(() => undefined); // a failed save never interrupts the game
  }, []);

  const clearBadge = useCallback(() => setBadge(undefined), []);

  return [badge, record, clearBadge] as const;
};
