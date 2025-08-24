/* blkprxy - Health Check */

export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    message: 'blkprxy is operational.',
  });
}
