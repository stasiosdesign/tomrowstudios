/* Where the server reads published content from while it builds or renders a
   page: Sanity (client.ts) everywhere but a review round, whose content is
   the snapshot committed on its branch (snapshot.ts). Server only: the
   middleware and the pages' getStaticPaths use it; browser code keeps
   client.ts. */
import { sanityClient } from './client';
import { snapshotClient } from './snapshot';

export const contentClient = __DEPLOYMENT__ === 'review' ? snapshotClient : sanityClient;
