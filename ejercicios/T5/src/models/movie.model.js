
import mongoose from 'mongoose';
import { z } from 'zod';

// Zod validation schema
const movieValidationSchema = z.object({
    title: z.string().min(2, 'El título debe tener al menos 2 caracteres'),
    director: z.string().nonempty('El director es obligatorio'),
    year: z.number().min(1888, 'El año debe ser mayor o igual a 1888').max(new Date().getFullYear(), 'El año no puede ser mayor al actual'),
    genre: z.enum(['action', 'comedy', 'drama', 'horror', 'scifi'], 'Género inválido'),
    copies: z.number().default(5),
    availableCopies: z.number().default(5),
    timesRented: z.number().default(0),
    cover: z.string().nullable().default(null),
});

// Convert to mongoose schema and validate using Zod
const movieSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        minlength: 2
    },
    director: {
        type: String,
        required: true
    },
    year: {
        type: Number,
        min: 1888,
        max: new Date().getFullYear()
    },
    genre: {
        type: String,
        enum: ['action', 'comedy', 'drama', 'horror', 'scifi']
    },
    copies: {
        type: Number,
        default: 5
    },
    availableCopies: {
        type: Number,
        default: 5
    },
    timesRented: {
        type: Number,
        default: 0
    },
    cover: {
        type: String,
        default: null
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 10
    }
});

// Custom validation using Zod
movieSchema.pre('save', async function(next) {
    try {
        await movieValidationSchema.parseAsync(this.toObject());
        next();
    } catch (error) {
        next(error);
    }
});

const Movie = mongoose.model('Movie', movieSchema);

export default Movie;
