import { Router } from 'express';
import * as movies from '../controllers/movies.controller.js';
import upload from '../utils/handleStorage.js';

const router = Router();


router.get('/', movies.getMovies);
router.post('/', movies.createMovie);
router.get('/stats/top', movies.getTopMovies)
router.get('/available', movies.getAvailableMovies);

router.patch('/:id/rating', movies.rateMovie);
router.patch('/:id/rent', movies.rentMovie)
router.patch('/:id/return', movies.returnMovie)
router.patch('/:id/cover', upload.single('cover'), movies.uploadOrReplaceCover)
router.get('/:id/cover', movies.getCover)

router.get('/:id', movies.getMovieById);
router.put('/:id', movies.updateMovie);
router.delete('/:id', movies.deleteMovie);


export default router;