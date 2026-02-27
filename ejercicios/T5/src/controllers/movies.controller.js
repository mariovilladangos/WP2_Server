import Movie from '../models/movie.model.js';
import path from 'path';
import fs from 'fs';

import { fileURLToPath, pathToFileURL  } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);  
const __dirname = dirname(__filename);  


export async function getMovies(req, res) {
    try {
        const { page = 1, limit = 10, search, genre } = req.query;
        const query = {};

        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        if (genre) {
            query.genre = genre;
        }

        const movies = await Movie.find(query)
            .skip((page - 1) * limit)
            .limit(limit);
        
        const totalMovies = await Movie.countDocuments(query);

        res.status(200).json({ movies, totalMovies, page, totalPages: Math.ceil(totalMovies / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function getMovieById(req, res) {
    try {
        const movie = await Movie.findById(req.params.id);
        if (!movie) {
            return res.status(404).json({ message: 'Película no encontrada' });
        }
        res.status(200).json(movie);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function createMovie(req, res) {
    try {
        const { title, director, year, genre, copies, cover } = req.body;

        const movie = new Movie({
            title,
            director,
            year,
            genre,
            copies,
            availableCopies: copies,
            timesRented: 0,
            cover: cover || null,
        });

        await movie.save();
        res.status(201).json(movie);
    } catch (error) {
        res.status(400).json({ message: 'Error al crear la película', error: error.message });
    }
}

export async function updateMovie(req, res) {
    try {
        const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!movie) {
            return res.status(404).json({ message: 'Película no encontrada' });
        }
        res.status(200).json(movie);
    } catch (error) {
        res.status(400).json({ message: 'Error al actualizar la película', error: error.message });
    }
}

export async function deleteMovie(req, res) {
    try {
        const movie = await Movie.findByIdAndDelete(req.params.id);
        if (!movie) {
            return res.status(404).json({ message: 'Película no encontrada' });
        }

        if (movie.cover) {
            // Eliminar el archivo de la carátula
            const coverPath = path.join(__dirname, '../../uploads', movie.cover);
            fs.unlinkSync(coverPath);
        }

        res.status(200).json({ message: 'Película eliminada con éxito' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar la película', error: error.message });
    }
}

export async function rentMovie(req, res) {
    try {
        const movie = await Movie.findById(req.params.id);
        if (!movie) {
            return res.status(404).json({ message: 'Película no encontrada' });
        }

        if (movie.availableCopies === 0) {
            return res.status(400).json({ message: 'No hay copias disponibles para alquilar' });
        }

        movie.availableCopies -= 1;
        movie.timesRented += 1;

        await movie.save();
        res.status(200).json(movie);
    } catch (error) {
        res.status(500).json({ message: 'Error al alquilar la película', error: error.message });
    }
}

export async function returnMovie(req, res) {
    try {
        const movie = await Movie.findById(req.params.id);
        if (!movie) {
            return res.status(404).json({ message: 'Película no encontrada' });
        }

        if (movie.availableCopies < movie.copies) {
            movie.availableCopies += 1;
            await movie.save();
            res.status(200).json(movie);
        } else {
            res.status(400).json({ message: 'No se pueden devolver más copias que las alquiladas' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al devolver la película', error: error.message });
    }
}

export async function uploadOrReplaceCover(req, res) {
    try {
        const movie = await Movie.findById(req.params.id);
        if (!movie) {
            return res.status(404).json({ message: 'Película no encontrada' });
        }

        // Verificar si se subió un archivo
        if (!req.file) {
            return res.status(400).json({ message: 'No se ha proporcionado un archivo de carátula' });
        }

        // Eliminar la carátula anterior si existe
        if (movie.cover) {
            const oldCoverPath = path.join(__dirname, '../../uploads', movie.cover);
            if (fs.existsSync(oldCoverPath)) {
                fs.unlinkSync(oldCoverPath);  // Eliminar el archivo anterior
            }
        }

        // Asignar la nueva carátula
        movie.cover = req.file.filename;
        await movie.save();
        
        res.status(200).json({ message: 'Carátula actualizada', cover: req.file.filename });
    } catch (error) {
        res.status(500).json({ message: 'Error al subir la carátula', error: error.message });
    }
}

export async function getCover(req, res) {
    try {
        const movie = await Movie.findById(req.params.id);
        if (!movie || !movie.cover) {
            return res.status(404).json({ message: 'Carátula no encontrada' });
        }

        res.sendFile(path.join(__dirname, '../../uploads', movie.cover));
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener la carátula', error: error.message });
    }
}

export async function getTopMovies(req, res) {
    try {
        const topMovies = await Movie.find().sort({ timesRented: -1 }).limit(5);
        res.status(200).json(topMovies);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener las estadísticas', error: error.message });
    }
}

export async function rateMovie(req, res) {
    try {
        const { id } = req.params; // ID de la película a valorar
        const { rating } = req.body;   // Rating proporcionado en el cuerpo de la solicitud

        // Validar que el rating esté dentro del rango permitido (0-10)
        if (rating < 0 || rating > 10) {
            return res.status(400).json({ message: 'La calificación debe estar entre 0 y 10.' });
        }

        // Encontrar la película y actualizar el campo rating
        const movie = await Movie.findByIdAndUpdate(
            id,
            { rating: rating },
            { new: true, runValidators: true }
        );

        // Si no se encuentra la película
        if (!movie) {
            return res.status(404).json({ message: 'Película no encontrada.' });
        }

        // Devolver la película actualizada
        res.status(200).json({ message: 'Película valorada correctamente.', movie });
    } catch (error) {
        res.status(500).json({ message: 'Error al valorar la película', error: error.message });
    }
}

export async function getAvailableMovies(req, res) {
    try {
        const movies = await Movie.find({ availableCopies: { $gt: 0 } });
        res.status(200).json(movies);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener películas disponibles', error: error.message });
    }
}