/* =============================================================
   💰 Mark as Reimbursed (Admin - After salary payment)
============================================================= */
export const markAsReimbursed = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = req.user;

    const tourRequest = await TourApproval.findById(id);

    if (!tourRequest) {
      return res.status(404).json({ message: "Tour request not found" });
    }

    // ✅ Only allow if status is Completed (expenses verified)
    if (tourRequest.status !== "Completed") {
      return res.status(400).json({ 
        message: "Tour must be completed (expenses verified) before marking as reimbursed" 
      });
    }

    const updated = await TourApproval.findByIdAndUpdate(
      id,
      {
        reimbursed: true,
        reimbursedBy: `${admin.empCode} - ${admin.name}`,
        reimbursedDate: new Date(),
      },
      { new: true }
    );

    res.json({
      success: true,
      message: "✅ Tour marked as reimbursed!",
      data: updated,
    });
  } catch (err) {
    console.error("Mark as Reimbursed Error:", err);
    res.status(500).json({ message: "Failed to mark as reimbursed" });
  }
};
