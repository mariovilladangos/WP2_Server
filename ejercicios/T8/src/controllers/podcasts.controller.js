import Podcast from '../models/podcast.model.js';
import { handleHttpError } from '../utils/handleError.js';

export const getPublishedPodcasts = async (req, res) => {
  try {
    const podcasts = await Podcast.find({ published: true }).populate('author', 'name email');
    return res.status(200).json(podcasts);
  } catch (err) {
    return handleHttpError(res, err.message);
  }
};

export const getAllPodcasts = async (req, res) => {
  try {
    const podcasts = await Podcast.find().populate('author', 'name email');
    return res.status(200).json(podcasts);
  } catch (err) {
    return handleHttpError(res, err.message);
  }
};

export const getPodcastById = async (req, res) => {
  try {
    const podcast = await Podcast.findById(req.params.id).populate('author', 'name email');
    if (!podcast) {
      return handleHttpError(res, 'Podcast no encontrado', 404);
    }
    return res.status(200).json(podcast);
  } catch (err) {
    return handleHttpError(res, err.message);
  }
};

export const createPodcast = async (req, res) => {
  try {
    const { title, description, category, duration, episodes, published } = req.body;
    const podcast = await Podcast.create({
      title,
      description,
      author: req.user._id,
      category,
      duration,
      episodes,
      published,
    });
    return res.status(201).json(podcast);
  } catch (err) {
    return handleHttpError(res, err.message);
  }
};

export const updatePodcast = async (req, res) => {
  try {
    const podcast = await Podcast.findById(req.params.id);
    if (!podcast) {
      return handleHttpError(res, 'Podcast no encontrado', 404);
    }
    if (podcast.author.toString() !== req.user._id.toString()) {
      return handleHttpError(res, 'No autorizado: no eres el autor', 403);
    }
    const updated = await Podcast.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.status(200).json(updated);
  } catch (err) {
    return handleHttpError(res, err.message);
  }
};

export const deletePodcast = async (req, res) => {
  try {
    const podcast = await Podcast.findByIdAndDelete(req.params.id);
    if (!podcast) {
      return handleHttpError(res, 'Podcast no encontrado', 404);
    }
    return res.status(200).json({ message: 'Podcast eliminado correctamente' });
  } catch (err) {
    return handleHttpError(res, err.message);
  }
};

export const togglePublish = async (req, res) => {
  try {
    const podcast = await Podcast.findById(req.params.id);
    if (!podcast) {
      return handleHttpError(res, 'Podcast no encontrado', 404);
    }
    podcast.published = !podcast.published;
    await podcast.save();
    return res.status(200).json(podcast);
  } catch (err) {
    return handleHttpError(res, err.message);
  }
};
