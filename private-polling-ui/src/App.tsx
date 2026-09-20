import React, { useEffect, useState } from 'react';
import { type Observable } from 'rxjs';
import { MainLayout, Board } from './components';
import { FeaturedPoll } from './components/FeaturedPoll';
import { FeedbackButton } from './components/FeedbackButton';
import { GettingStarted } from './components/GettingStarted';
import { FEATURED_CONTRACT_ADDRESS, pollFromUrl } from './config/product';
import { type BoardDeployment } from './contexts';
import { useDeployedBoardContext } from './hooks';

/**
 * Root component.
 *
 * Landing order is deliberate: the poll someone was invited to (or the featured public
 * poll) first, setup help second, and "create your own" last — most visitors come to vote.
 */
const App: React.FC = () => {
  const boardApiProvider = useDeployedBoardContext();
  const [boardDeployments, setBoardDeployments] = useState<Array<Observable<BoardDeployment>>>([]);
  const [invitedAddress] = useState(pollFromUrl);
  const spotlightAddress = invitedAddress ?? FEATURED_CONTRACT_ADDRESS;

  useEffect(() => {
    const subscription = boardApiProvider.boardDeployments$.subscribe(setBoardDeployments);
    return () => subscription.unsubscribe();
  }, [boardApiProvider]);

  return (
    <MainLayout>
      {boardDeployments.length === 0 && spotlightAddress && (
        <FeaturedPoll
          address={spotlightAddress}
          fromInviteLink={invitedAddress !== undefined}
          onOpen={() => boardApiProvider.resolve(spotlightAddress)}
        />
      )}
      {boardDeployments.map((boardDeployment, idx) => (
        <div data-testid={`board-${idx}`} key={`board-${idx}`}>
          <Board boardDeployment$={boardDeployment} />
        </div>
      ))}
      <GettingStarted />
      <div data-testid="board-start">
        <Board />
      </div>
      <FeedbackButton />
    </MainLayout>
  );
};

export default App;
