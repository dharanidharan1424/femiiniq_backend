const pool = require('../../config/database');

exports.updateTravelSettings = async (req, res) => {
    try {
        const { travel_radius, travel_charge } = req.body;
        const agent_id = req.user.agent_id;

        // Validate inputs
        if (travel_radius === undefined || travel_charge === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Travel radius and travel charge are required'
            });
        }

        // Update database
        await pool.query(
            `UPDATE agents SET travel_radius = ?, travel_charge = ? WHERE agent_id = ?`,
            [travel_radius, travel_charge, agent_id]
        );

        res.json({
            success: true,
            message: 'Travel settings updated successfully'
        });
    } catch (error) {
        console.error('Travel settings update error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
