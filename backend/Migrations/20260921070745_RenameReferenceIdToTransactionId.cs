using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class RenameReferenceIdToTransactionId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "ReferenceId",
                table: "JournalEntries",
                newName: "TransactionId");

            migrationBuilder.RenameIndex(
                name: "IX_JournalEntries_ReferenceId",
                table: "JournalEntries",
                newName: "IX_JournalEntries_TransactionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "TransactionId",
                table: "JournalEntries",
                newName: "ReferenceId");

            migrationBuilder.RenameIndex(
                name: "IX_JournalEntries_TransactionId",
                table: "JournalEntries",
                newName: "IX_JournalEntries_ReferenceId");
        }
    }
}
