import Banner from "../models/Banner.js";

// 🔥 GET all banners (optimized)
export const getBanners = async (req, res) => {
  try {
    const banners = await Banner.find()
      .sort({ createdAt: -1 })
      .lean();  // SUPER IMPORTANT – 5x faster for base64 images

    res.status(200).json({
      success: true,
      data: banners,
    });

  } catch (error) {
    console.error("getBanners error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch banners",
    });
  }
};


// 🔥 CREATE banners (optimized insertMany)
export const createBanner = async (req, res) => {
  try {
    const { banners } = req.body;

    if (!banners || !Array.isArray(banners) || banners.length === 0) {
      return res.status(400).json({ message: "Invalid banner data" });
    }

    // insertMany is fastest for bulk uploads
    const created = await Banner.insertMany(banners, { ordered: false });

    res.status(201).json({
      success: true,
      data: created,
    });

  } catch (error) {
    console.error("createBanner error:", error);
    res.status(500).json({ message: "Failed to upload banners" });
  }
};


// 🔥 UPDATE banner link (optimized)
export const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const { link } = req.body;

    const banner = await Banner.findByIdAndUpdate(
      id,
      { link },
      { new: true }
    ).lean();

    res.status(200).json({
      success: true,
      data: banner,
    });

  } catch (error) {
    res.status(500).json({ message: "Failed to update banner" });
  }
};


// 🔥 DELETE banner (optimized)
export const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;

    await Banner.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Banner deleted",
    });

  } catch (error) {
    res.status(500).json({ message: "Failed to delete banner" });
  }
};
