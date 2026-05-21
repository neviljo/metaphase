import { Schema, model } from 'mongoose';

const playerSchema = new Schema(
  {
    name: { type: String, required: true },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    weapon: { type: String, default: 'sword1' },
    armor: { type: String, default: 'clotharmor' },
  },
  { timestamps: true }
);

export const PlayerModel = model('Player', playerSchema);
