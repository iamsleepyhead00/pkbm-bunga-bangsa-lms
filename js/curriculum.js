/**
 * curriculum.js - Data kurikulum Paket A/B/C
 * Berisi daftar mata pelajaran dan kelas per program pendidikan
 */

export const KURIKULUM = {
  PAKET_A: {
    label: "Paket A (Setara SD)",
    kelas: ["Kelas 6"],
    mapel: [
      "Matematika",
      "B. Indonesia",
      "IPA",
      "IPS",
      "PKN",
      "Agama",
      "SBK",
      "PJOK"
    ]
  },
  PAKET_B: {
    label: "Paket B (Setara SMP)",
    kelas: ["Kelas 1", "Kelas 2", "Kelas 3"],
    mapel: [
      "Matematika",
      "B. Indonesia",
      "B. Inggris",
      "IPA",
      "IPS",
      "PKN",
      "Agama",
      "Seni Budaya",
      "PJOK",
      "Prakarya"
    ]
  },
  PAKET_C: {
    label: "Paket C (Setara SMA)",
    kelas: ["Kelas 1", "Kelas 2", "Kelas 3"],
    mapel: [
      "Matematika",
      "B. Indonesia",
      "B. Inggris",
      "Fisika",
      "Biologi",
      "Kimia",
      "Ekonomi",
      "Sosiologi",
      "Geografi",
      "Sejarah",
      "PKN",
      "Agama"
    ]
  }
};

/**
 * Mendapatkan daftar mata pelajaran berdasarkan program
 * @param {string} program - PAKET_A, PAKET_B, atau PAKET_C
 * @returns {string[]} daftar mata pelajaran
 */
export function getMapelByProgram(program) {
  const data = KURIKULUM[program];
  return data ? [...data.mapel] : [];
}

/**
 * Mendapatkan daftar kelas berdasarkan program
 * @param {string} program - PAKET_A, PAKET_B, atau PAKET_C
 * @returns {string[]} daftar kelas
 */
export function getKelasByProgram(program) {
  const data = KURIKULUM[program];
  return data ? [...data.kelas] : [];
}

/**
 * Mendapatkan label program
 * @param {string} program - PAKET_A, PAKET_B, atau PAKET_C
 * @returns {string} label program
 */
export function getProgramLabel(program) {
  const data = KURIKULUM[program];
  return data ? data.label : '';
}

/**
 * Mendapatkan daftar semua program yang tersedia
 * @returns {string[]} daftar key program
 */
export function getAllPrograms() {
  return Object.keys(KURIKULUM);
}
