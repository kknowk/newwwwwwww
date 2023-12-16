import {
  SkyWayContext,
  SkyWayRoom,
  type P2PRoom,
  type LocalRoomMember,
  type RoomMetadataUpdatedEvent,
} from "@skyway-sdk/room";

export class SkyWayBag {
  public static async create(user_id: number): Promise<SkyWayBag | null> {
    const response = await fetch(`/api/chat-room/skyway-token`);
    if (!response.ok) {
      console.debug("Skyway Room Context Creation: failed");
      return null;
    }
    console.debug("Skyway Room Context Creation: success");
    const token = await response.text();
    const context = await SkyWayContext.Create(token);
    return new SkyWayBag(context, user_id);
  }

  constructor(private readonly context: SkyWayContext, private readonly user_id: number) {
    this.membership = null;
    this.metadata_id = -1;
    this.updateCallback = null;
  }

  private membership: LocalRoomMember | null;
  private metadata_id: number;
  private rooms: Map<number, P2PRoom> = new Map();
  private current_room_id: number = -1;
  private updateCallback: (() => void) | null;

  public leaveRoom = async () => {
    if (this.membership == null) {
      return;
    }
    const room = this.rooms.get(this.current_room_id);
    this.current_room_id = -1;
    if (room == null) {
      return;
    }
    console.debug("Leave Room: " + room.name);
    if (room.disposed) {
      this.rooms.delete(this.current_room_id);
    }
    room.leave(this.membership);
    room.onMetadataUpdated.removeAllListeners();
    if (room.members.length === 0) {
      await room.dispose();
      this.rooms.delete(this.current_room_id);
      this.membership = null;
    }
  };

  public readonly joinRoom = async (room_id: number, updateCallback: () => void) => {
    this.current_room_id = room_id;
    const roomName = `chat-${room_id}`;
    let room = this.rooms.get(room_id);
    if (room == null) {
      room = await SkyWayRoom.FindOrCreate(this.context, {
        type: "p2p",
        name: roomName,
      });
      this.rooms.set(room_id, room);
    }
    this.updateCallback = updateCallback;
    console.debug(
      "Join Room: " + room_id + ", update callback is not null: " + (this.updateCallback != null)
    );
    if (this.membership === null || this.membership.roomName !== roomName) {
      this.membership = await room.join({
        name: `user-${this.user_id}`,
      });
    }
    room.onMetadataUpdated.removeAllListeners();
    room.onMetadataUpdated.add(this.onMetadataUpdated);
  };

  public readonly send = () => {
    const room = this.rooms.get(this.current_room_id);
    if (room == null) {
      console.error("Send Message Failed because room is null.");
      return;
    }
    this.metadata_id++;
    console.debug("Send Message: " + this.metadata_id);
    room.updateMetadata(this.metadata_id.toString());
  };

  private readonly onMetadataUpdated = (args: RoomMetadataUpdatedEvent) => {
    if (this.updateCallback == null) {
      console.debug("On Metadata Update but callback is null");
      return;
    }
    const room = this.rooms.get(this.current_room_id);
    if (room == null) {
      console.debug("On Metadata Update but room is null");
      return;
    }
    this.metadata_id = Number.parseInt(args.metadata);
    console.debug("Update Callback: " + this.metadata_id);
    this.updateCallback();
  };

  public readonly dispose = async () => {
    const promises: Promise<void>[] = [];
    for (const [_, room] of this.rooms) {
      if (room.disposed) {
        continue;
      }
      promises.push(room.dispose());
    }
    await Promise.all(promises);
    this.context.dispose();
  };
}
