import axios from 'axios';

/**
 * Converts keys to snake_case and strips special characters/spaces
 * Also extracts `ref_no` and `group_ref_no` from "REF NO."
 */
const normalizeKeys = (item) => {
  const newItem = {};

  for (const key in item) {
    const value = item[key];

    if (key.toLowerCase().includes('ref no')) {
      // Extract ref_no and group_ref_no
      const refNoMatch = value.match(/DR\s*#\s*(\d+)/i);
      const groupMatch = value.match(/\((\d+)\)/);

      if (refNoMatch) newItem.ref_no = refNoMatch[1];
      if (groupMatch) newItem.group_ref_no = groupMatch[1];
    } else {
      const newKey = key
        .toLowerCase()
        .replace(/[^\w\s]/g, '')    // remove non-word characters
        .replace(/\s+/g, '_');      // replace spaces with underscores

      newItem[newKey] = value;
    }
  }

  return newItem;
};

const BASE_URL = 'http://localhost:5000';

export const saveWaybill = async ({ data }) => {
  try {
    const cleanedData = data.map(normalizeKeys);

    const payload = {
      data: cleanedData
    };
    console.log(payload)
    const response = await axios.post(`${BASE_URL}/save-dr`, payload);
    return response.data;
  } catch (error) {
    console.error('Error saving waybill:', error);
    throw error;
  }
};

export const deleteWaybill = async ({ data }) => {
  try {
    const cleanedData = data.map(normalizeKeys);

    const payload = {
      data: cleanedData
    };
    console.log(payload)
    const response = await axios.post(`${BASE_URL}/delete-dr`, payload);
    return response.data;
  } catch (error) {
    console.error('Error removing waybill:', error);
    throw error;
  }
};
